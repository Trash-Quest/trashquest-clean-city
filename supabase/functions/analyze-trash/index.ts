// analyze-trash v13 — Roboflow-only pipeline (yolo-waste-detection)
// แทนที่ LLM (OpenRouter) เดิมทั้งหมด: ใช้ object detection นับชิ้น+จำแนกประเภทขยะ
// เก็บผลต่อรูปลง report_photos.trash_type/points และสรุปลง reports
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ROBOFLOW_API_KEY = Deno.env.get("ROBOFLOW_API_KEY") ?? "";
const ROBOFLOW_MODEL = Deno.env.get("ROBOFLOW_MODEL") ?? "yolo-waste-detection/3";
const ROBOFLOW_ENDPOINT = Deno.env.get("ROBOFLOW_ENDPOINT") ?? "https://detect.roboflow.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CONFIDENCE = 0.4; // เชื่อผลตั้งแต่ 40% ขึ้นไป
const MAX_PHOTOS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// class ของ yolo-waste-detection/3: BIODEGRADABLE, CARDBOARD, GLASS, METAL, PAPER, PLASTIC
// (เผื่อ class อื่นไว้ด้วย เผื่อสลับโมเดลภายหลังผ่าน ROBOFLOW_MODEL)
const CATEGORY_MAP: Record<string, string> = {
  plastic: "ขยะรีไซเคิล", metal: "ขยะรีไซเคิล", glass: "ขยะรีไซเคิล",
  paper: "ขยะรีไซเคิล", cardboard: "ขยะรีไซเคิล",
  biodegradable: "ขยะอินทรีย์", food: "ขยะอินทรีย์",
  battery: "ขยะอันตราย", ewaste: "ขยะอันตราย", hazardous: "ขยะอันตราย",
  trash: "ขยะทั่วไป", general: "ขยะทั่วไป",
};

// จำนวนชิ้นขยะ → แต้ม (คงสเกล 10-100 เดียวกับเกณฑ์ low/medium/high เดิม)
function scoreFromCount(n: number): number {
  if (n <= 0) return 0;
  if (n >= 6) return Math.min(100, 50 + n * 5); // high
  if (n >= 3) return 30 + n * 5;                // medium
  return 10 + n * 10;                            // low: 1 ชิ้น=20, 2 ชิ้น=30
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

type Prediction = { class: string; confidence: number };

// เรียก Roboflow ด้วย URL ของรูปก่อน (เร็ว ไม่ต้องโหลดเอง) ถ้าไม่สำเร็จ fallback เป็น base64
async function detectPhoto(publicUrl: string): Promise<Prediction[]> {
  const base = `${ROBOFLOW_ENDPOINT}/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}&confidence=${CONFIDENCE * 100}&overlap=30`;

  let res = await fetch(`${base}&image=${encodeURIComponent(publicUrl)}`, { method: "POST" });
  if (!res.ok) {
    const imgRes = await fetch(publicUrl);
    if (!imgRes.ok) throw new Error(`โหลดรูปไม่สำเร็จ (${imgRes.status})`);
    const b64 = toBase64(await imgRes.arrayBuffer());
    res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: b64,
    });
    if (!res.ok) throw new Error(`Roboflow ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const preds: Prediction[] = (json.predictions ?? [])
    .map((p: { class?: string; confidence?: number }) => ({
      class: String(p.class ?? "").toLowerCase(),
      confidence: Number(p.confidence ?? 0),
    }))
    .filter((p: Prediction) => p.confidence >= CONFIDENCE);
  return preds;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let reportId: string | undefined;
  let statusTouched = false;

  try {
    if (!ROBOFLOW_API_KEY) {
      return Response.json(
        { error: "ระบบตรวจภาพยังไม่พร้อม (ยังไม่ได้ตั้งค่า ROBOFLOW_API_KEY) รายงานถูกเก็บไว้ในสถานะรอตรวจ" },
        { status: 503, headers: corsHeaders },
      );
    }

    // ── ตรวจผู้เรียก + ความเป็นเจ้าของ report (v12 เดิมไม่เช็ค) ──
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    reportId = body?.reportId;
    if (!reportId || typeof reportId !== "string") {
      return Response.json({ error: "ต้องส่ง reportId มาด้วย" }, { status: 400, headers: corsHeaders });
    }

    const { data: report, error: rErr } = await admin
      .from("reports").select("id, user_id, status").eq("id", reportId).single();
    if (rErr || !report) throw new Error("ไม่พบรายงานนี้");
    if (report.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }
    // กันเรียกซ้ำเพื่อปั่นแต้ม (v12 เดิมเรียกซ้ำได้ไม่จำกัด)
    if (report.status !== "pending" && report.status !== "analyzing") {
      return Response.json(
        { error: `รายงานนี้ถูกตรวจไปแล้ว (${report.status})`, status: report.status },
        { status: 409, headers: corsHeaders },
      );
    }

    // ── โหลดรูป ──
    const { data: photos, error: photosErr } = await admin
      .from("report_photos")
      .select("id, public_url, storage_path")
      .eq("report_id", reportId)
      .order("display_order");
    if (photosErr || !photos?.length) throw new Error("ไม่พบรูปภาพของรายงานนี้");

    await admin.from("reports").update({ status: "analyzing" }).eq("id", reportId);
    statusTouched = true;

    // ── ตรวจทุกรูปด้วย Roboflow (สูงสุด 5 รูป) ──
    const targets = photos.slice(0, MAX_PHOTOS);
    const perPhoto = await Promise.all(targets.map(async (p) => {
      const preds = await detectPhoto(p.public_url);
      const counts = new Map<string, number>();
      for (const d of preds) counts.set(d.class, (counts.get(d.class) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const avgConf = preds.length
        ? preds.reduce((s, d) => s + d.confidence, 0) / preds.length : 0;
      return { photo: p, preds, counts, top, avgConf };
    }));

    // ── สรุปผลระดับ report ──
    // รูปทั้งชุดคือจุดขยะเดียวกัน → ใช้จำนวนชิ้นของรูปที่เจอมากสุด ไม่บวกข้ามรูป (กันนับซ้ำ)
    const bestCount = Math.max(...perPhoto.map((r) => r.preds.length), 0);
    const classTotals = new Map<string, number>();
    for (const r of perPhoto)
      for (const [cls, n] of r.counts) classTotals.set(cls, Math.max(classTotals.get(cls) ?? 0, n));
    const primaryClass = [...classTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const approved = bestCount >= 1;
    const points = approved ? scoreFromCount(bestCount) : 0;
    const category = primaryClass ? (CATEGORY_MAP[primaryClass] ?? "ขยะทั่วไป") : null;

    // ── เก็บผลลง report_photos ต่อรูป (แก้ปัญหา trash_type เป็น null ทั้งตาราง) ──
    for (const r of perPhoto) {
      await admin.from("report_photos").update({
        trash_type: r.top,
        points: scoreFromCount(r.preds.length),
      }).eq("id", r.photo.id);
    }

    // ── อัปเดต report ──
    const { error: updateErr } = await admin.from("reports").update({
      status: approved ? "approved" : "rejected",
      points_awarded: points,
      total_points: points,
    }).eq("id", reportId);
    if (updateErr) throw updateErr;

    // ── ไม่ผ่าน → ลบรูปออกจาก Storage (พฤติกรรมเดิมของ v12) ──
    if (!approved) {
      const paths = photos.map((p) => p.storage_path).filter(Boolean);
      if (paths.length) await admin.storage.from("trash-photos").remove(paths);
    }

    // ── ผ่าน → เพิ่มแต้มผ่าน RPC (เหมือน v12) ──
    if (approved && points > 0) {
      const { error: rpcErr } = await admin.rpc("increment_user_points", {
        uid: report.user_id,
        pts: points,
      });
      if (rpcErr) console.error("increment_user_points ล้มเหลว:", rpcErr);
    }

    const detail = perPhoto
      .map((r, i) => `รูป ${i + 1}: พบ ${r.preds.length} ชิ้น${r.top ? ` (${r.top})` : ""}`)
      .join(", ");

    return Response.json({
      status: approved ? "approved" : "rejected",
      points_awarded: points,
      trash_type: category,
      primary_class: primaryClass,
      item_count: bestCount,
      rejection_reason: approved ? null : "ไม่พบขยะในภาพ (ตรวจด้วยโมเดลตรวจจับวัตถุ)",
      description: detail,
    }, { headers: corsHeaders });

  } catch (e) {
    console.error("analyze-trash error:", e);
    // อย่าค้างสถานะ analyzing ถ้าล้มกลางคัน — คืนเป็น pending ให้ลองใหม่ได้ (ไม่ reject มั่ว)
    if (reportId && statusTouched) {
      await admin.from("reports").update({ status: "pending" }).eq("id", reportId);
    }
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
