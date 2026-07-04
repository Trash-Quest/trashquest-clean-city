// analyze-trash-roboflow — วิเคราะห์รูปขยะด้วย Roboflow YOLO (yolo-waste-detection/1)
// deploy: ตั้ง secret ROBOFLOW_API_KEY ใน Supabase Edge Functions ก่อนใช้งาน
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ROBOFLOW_API_KEY = Deno.env.get("ROBOFLOW_API_KEY") ?? "";
const ROBOFLOW_MODEL = Deno.env.get("ROBOFLOW_MODEL") ?? "yolo-waste-detection/1";
const CONFIDENCE = Number(Deno.env.get("ROBOFLOW_CONFIDENCE") ?? "0.2"); // รูปจริง confidence มักอยู่ 20-40%
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// map class จริงทั้ง 42 ตัวของ yolo-waste-detection/1 → หมวดขยะไทย 4 หมวด
const CATEGORY_MAP: Record<string, string> = {
  // ขยะรีไซเคิล
  "glass bottle": "ขยะรีไซเคิล", "plastic bottle": "ขยะรีไซเคิล", "aluminum can": "ขยะรีไซเคิล",
  "cardboard": "ขยะรีไซเคิล", "paper": "ขยะรีไซเคิล", "paper bag": "ขยะรีไซเคิล",
  "tin": "ขยะรีไซเคิล", "milk bottle": "ขยะรีไซเคิล", "plastic can": "ขยะรีไซเคิล",
  "plastic canister": "ขยะรีไซเคิล", "plastic cup": "ขยะรีไซเคิล", "plastic caps": "ขยะรีไซเคิล",
  "aluminum caps": "ขยะรีไซเคิล", "tetra pack": "ขยะรีไซเคิล", "scrap metal": "ขยะรีไซเคิล",
  "metal shavings": "ขยะรีไซเคิล", "iron utensils": "ขยะรีไซเคิล", "foil": "ขยะรีไซเคิล",
  "paper cups": "ขยะรีไซเคิล", "postal packaging": "ขยะรีไซเคิล", "printing industry": "ขยะรีไซเคิล",
  "papier mache": "ขยะรีไซเคิล", "paper shavings": "ขยะรีไซเคิล", "cellulose": "ขยะรีไซเคิล",
  "plastic shaker": "ขยะรีไซเคิล",
  // ขยะอินทรีย์
  "organic": "ขยะอินทรีย์", "wood": "ขยะอินทรีย์",
  // ขยะอันตราย
  "electronics": "ขยะอันตราย", "aerosols": "ขยะอันตราย",
  "container for household chemicals": "ขยะอันตราย", "liquid": "ขยะอันตราย",
  // ขยะทั่วไป (ที่เหลือ fallback เป็นขยะทั่วไปอยู่แล้ว)
  "plastic bag": "ขยะทั่วไป", "zip plastic bag": "ขยะทั่วไป", "stretch film": "ขยะทั่วไป",
  "combined plastic": "ขยะทั่วไป", "unknown plastic": "ขยะทั่วไป", "plastic toys": "ขยะทั่วไป",
  "textile": "ขยะทั่วไป", "furniture": "ขยะทั่วไป", "ceramic": "ขยะทั่วไป",
  "disposable tableware": "ขยะทั่วไป", "plastic shavings": "ขยะทั่วไป",
};

// จำนวนชิ้นขยะที่ตรวจเจอ → ระดับ + แต้ม (low 1-2 / medium 3-5 / high 6+)
function scoreFromCount(n: number) {
  if (n >= 6) return { severity: "high", points: Math.min(100, 50 + n * 5) };
  if (n >= 3) return { severity: "medium", points: 30 + n * 5 };
  return { severity: "low", points: 10 + n * 10 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reportId } = await req.json();
    if (!reportId) {
      return Response.json({ error: "ต้องส่ง reportId มาด้วย" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. ดึงรูปของรายงานนี้
    const { data: photos, error: photosErr } = await supabase
      .from("report_photos")
      .select("id, public_url, storage_path")
      .eq("report_id", reportId)
      .order("display_order");
    if (photosErr || !photos?.length) throw new Error("ไม่พบรูปภาพของรายงานนี้");

    // 2. ส่งแต่ละรูป (สูงสุด 3) ให้ Roboflow ตรวจจับ — ส่งเป็น URL ตรง ไม่ต้องโหลดเอง
    const classCount: Record<string, number> = {};
    let totalDetections = 0;

    for (const photo of photos.slice(0, 3)) {
      if (!photo.public_url) continue;
      const rfRes = await fetch(
        `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}&confidence=${CONFIDENCE * 100}&image=${encodeURIComponent(photo.public_url)}`,
        { method: "POST" },
      );
      if (!rfRes.ok) throw new Error(`Roboflow Error: ${rfRes.status} - ${await rfRes.text()}`);
      const rf = await rfRes.json();

      const preds = (rf.predictions ?? []).filter((p: any) => (p.confidence ?? 0) >= CONFIDENCE);
      totalDetections += preds.length;
      for (const p of preds) classCount[p.class] = (classCount[p.class] ?? 0) + 1;

      // เติมประเภทขยะกลับเข้า report_photos
      const top = preds.sort((a: any, b: any) => b.confidence - a.confidence)[0];
      if (top) {
        await supabase
          .from("report_photos")
          .update({ trash_type: CATEGORY_MAP[top.class?.toLowerCase()] ?? "ขยะทั่วไป", points: Math.round(top.confidence * 100) })
          .eq("id", photo.id);
      }
    }

    // 3. สรุปผล
    const approved = totalDetections > 0;
    const topClass = Object.entries(classCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const trashType = topClass ? (CATEGORY_MAP[topClass.toLowerCase()] ?? "ขยะทั่วไป") : null;
    const { severity, points } = approved ? scoreFromCount(totalDetections) : { severity: null, points: 0 };

    // 4. อัปเดตสถานะรายงาน
    const { data: report, error: updateErr } = await supabase
      .from("reports")
      .update({ status: approved ? "approved" : "rejected", points_awarded: points })
      .eq("id", reportId)
      .select("user_id")
      .single();
    if (updateErr) throw updateErr;

    // 5. ไม่ใช่ขยะ → ลบรูปออกจาก Storage
    if (!approved) {
      const paths = photos.map((p) => p.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from("trash-photos").remove(paths);
    }

    // 6. ผ่าน → เพิ่มแต้มให้ user
    if (approved && points > 0 && report?.user_id) {
      const { error: rpcErr } = await supabase.rpc("increment_user_points", {
        uid: report.user_id,
        pts: points,
      });
      if (rpcErr) console.error("เพิ่มแต้มไม่สำเร็จ:", rpcErr);
    }

    return Response.json({
      status: approved ? "approved" : "rejected",
      points_awarded: points,
      trash_type: trashType,
      detections: totalDetections,
      severity,
      classes: classCount,
      description: approved ? `ตรวจพบขยะ ${totalDetections} ชิ้น` : "ไม่พบขยะในรูป",
      rejection_reason: approved ? null : "AI ไม่พบขยะในรูปภาพ",
    }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("analyze-trash-roboflow error:", e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
});
