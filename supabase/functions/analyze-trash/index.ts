// analyze-trash v14 — Roboflow detection + ระบบกันโกง
// เพิ่มจาก v13: (1) กันรูปซ้ำ/คล้ายรายสัปดาห์ด้วย perceptual hash (dHash) คำนวณฝั่ง server
//              (2) เพดานส่ง 20 ครั้ง/สัปดาห์ นับรวมทุกแอคบนเครื่องเดียวกัน
//              (3) เก็บ device/IP signal ไว้จับแอคหลุม (flag ไม่ block)
// คงจาก v13: ตรวจ auth + ความเป็นเจ้าของ + กันเรียกซ้ำ, นับชิ้นจากรูปที่เจอมากสุด (ไม่บวกข้ามรูป)
// คงจากระบบเดิมที่ใช้งานจริง: โมเดล yolo-waste-detection/1, confidence 0.2, CATEGORY_MAP 42 class
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const ROBOFLOW_API_KEY = Deno.env.get("ROBOFLOW_API_KEY") ?? "";
const ROBOFLOW_MODEL = Deno.env.get("ROBOFLOW_MODEL") ?? "yolo-waste-detection/1";
const ROBOFLOW_ENDPOINT = Deno.env.get("ROBOFLOW_ENDPOINT") ?? "https://detect.roboflow.com";
const CONFIDENCE = Number(Deno.env.get("ROBOFLOW_CONFIDENCE") ?? "0.2"); // รูปจริง confidence มักอยู่ 20-40%
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_PHOTOS = 5;

// ── ค่าปรับแต่งระบบกันโกง ──────────────────────────────────────────
const WEEKLY_LIMIT = 20;        // ส่งได้กี่ครั้ง/สัปดาห์ (นับรวมทุกแอคบนเครื่องเดียว)
const DHASH_THRESHOLD = 10;     // Hamming distance (จาก 64 bit) ≤ ค่านี้ = รูป "คล้ายกัน"
const SIMILAR_PENALTY = 0.6;    // ส่งรูปคล้ายเดิมครั้งที่ 2-4 ของสัปดาห์ ได้แต้ม 60% (ลด 40%)
const SIMILAR_ZERO_AFTER = 5;   // ครั้งที่ 5 ขึ้นไป ไม่ได้แต้ม
const SYBIL_ACCOUNTS = 3;       // เครื่องเดียวมีตั้งแต่กี่แอคขึ้นไป → flag ให้แอดมินตรวจ

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// map class ของโมเดล → หมวดขยะไทย 4 หมวด
// รวมทั้ง 42 class ของ yolo-waste-detection/1 และ 6 class ของ /3 (เผื่อสลับโมเดลผ่าน env)
const CATEGORY_MAP: Record<string, string> = {
  // ขยะรีไซเคิล (yolo-waste-detection/1)
  "glass bottle": "ขยะรีไซเคิล", "plastic bottle": "ขยะรีไซเคิล", "aluminum can": "ขยะรีไซเคิล",
  "cardboard": "ขยะรีไซเคิล", "paper": "ขยะรีไซเคิล", "paper bag": "ขยะรีไซเคิล",
  "tin": "ขยะรีไซเคิล", "milk bottle": "ขยะรีไซเคิล", "plastic can": "ขยะรีไซเคิล",
  "plastic canister": "ขยะรีไซเคิล", "plastic cup": "ขยะรีไซเคิล", "plastic caps": "ขยะรีไซเคิล",
  "aluminum caps": "ขยะรีไซเคิล", "tetra pack": "ขยะรีไซเคิล", "scrap metal": "ขยะรีไซเคิล",
  "metal shavings": "ขยะรีไซเคิล", "iron utensils": "ขยะรีไซเคิล", "foil": "ขยะรีไซเคิล",
  "paper cups": "ขยะรีไซเคิล", "postal packaging": "ขยะรีไซเคิล", "printing industry": "ขยะรีไซเคิล",
  "papier mache": "ขยะรีไซเคิล", "paper shavings": "ขยะรีไซเคิล", "cellulose": "ขยะรีไซเคิล",
  "plastic shaker": "ขยะรีไซเคิล",
  // ขยะรีไซเคิล (yolo-waste-detection/3)
  "plastic": "ขยะรีไซเคิล", "metal": "ขยะรีไซเคิล", "glass": "ขยะรีไซเคิล",
  // ขยะอินทรีย์
  "organic": "ขยะอินทรีย์", "wood": "ขยะอินทรีย์", "biodegradable": "ขยะอินทรีย์", "food": "ขยะอินทรีย์",
  // ขยะอันตราย
  "electronics": "ขยะอันตราย", "aerosols": "ขยะอันตราย",
  "container for household chemicals": "ขยะอันตราย", "liquid": "ขยะอันตราย",
  "battery": "ขยะอันตราย", "ewaste": "ขยะอันตราย", "hazardous": "ขยะอันตราย",
  // ขยะทั่วไป (ที่เหลือ fallback เป็นขยะทั่วไปอยู่แล้ว)
  "plastic bag": "ขยะทั่วไป", "zip plastic bag": "ขยะทั่วไป", "stretch film": "ขยะทั่วไป",
  "combined plastic": "ขยะทั่วไป", "unknown plastic": "ขยะทั่วไป", "plastic toys": "ขยะทั่วไป",
  "textile": "ขยะทั่วไป", "furniture": "ขยะทั่วไป", "ceramic": "ขยะทั่วไป",
  "disposable tableware": "ขยะทั่วไป", "plastic shavings": "ขยะทั่วไป",
  "trash": "ขยะทั่วไป", "general": "ขยะทั่วไป",
};

// จำนวนชิ้นขยะ → แต้ม (คงสเกล 10-100 เดียวกับเกณฑ์ low/medium/high เดิม)
function scoreFromCount(n: number): number {
  if (n <= 0) return 0;
  if (n >= 6) return Math.min(100, 50 + n * 5); // high
  if (n >= 3) return 30 + n * 5;                // medium
  return 10 + n * 10;                            // low: 1 ชิ้น=20, 2 ชิ้น=30
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

// ── สัปดาห์แบบ ISO ยึดเวลาไทย (จันทร์ 00:00 น. เวลาไทย = ต้นสัปดาห์) ──
const BANGKOK_OFFSET_MS = 7 * 3600 * 1000;
function isoWeek(now: Date): { key: string; startUtc: Date } {
  const local = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const day = d.getUTCDay() || 7; // 1=จันทร์ .. 7=อาทิตย์
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + 1);
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return {
    key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    startUtc: new Date(monday.getTime() - BANGKOK_OFFSET_MS),
  };
}

// ── dHash 64-bit: ย่อรูปเป็น 9×8 เกรย์สเกล แล้วเทียบความสว่างพิกเซลข้างกัน ──
// ทนต่อการบีบอัด/ย่อ/ครอปเล็กน้อย — รูปเดิมที่ถูก re-compress ยังได้ hash ใกล้เคียงกัน
async function dhashHex(bytes: Uint8Array): Promise<string | null> {
  try {
    const img = await Image.decode(bytes);
    const small = img.resize(9, 8);
    let bits = 0n;
    for (let y = 1; y <= 8; y++) {
      for (let x = 1; x <= 8; x++) {
        const [r1, g1, b1] = Image.colorToRGBA(small.getPixelAt(x, y));
        const [r2, g2, b2] = Image.colorToRGBA(small.getPixelAt(x + 1, y));
        const l1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
        const l2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
        bits = (bits << 1n) | (l1 > l2 ? 1n : 0n);
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null; // decode ไม่ได้ (ไฟล์เสีย/ฟอร์แมตแปลก) → ข้ามการเช็ครูปนี้ ไม่ให้ล้มทั้งรายงาน
  }
}

function hamming(aHex: string, bHex: string): number {
  let x = BigInt("0x" + aHex) ^ BigInt("0x" + bHex);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

type Prediction = { class: string; confidence: number };

// เรียก Roboflow ด้วย URL ของรูปก่อน (เร็ว) ถ้าไม่สำเร็จใช้ไบต์ที่โหลดไว้แล้วส่งเป็น base64
async function detectPhoto(publicUrl: string, bytes: Uint8Array | null): Promise<Prediction[]> {
  const base = `${ROBOFLOW_ENDPOINT}/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}&confidence=${CONFIDENCE * 100}&overlap=30`;
  let res = await fetch(`${base}&image=${encodeURIComponent(publicUrl)}`, { method: "POST" });
  if (!res.ok && bytes) {
    res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: toBase64(bytes),
    });
  }
  if (!res.ok) throw new Error(`Roboflow ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json.predictions ?? [])
    .map((p: { class?: string; confidence?: number }) => ({
      class: String(p.class ?? "").toLowerCase(),
      confidence: Number(p.confidence ?? 0),
    }))
    .filter((p: Prediction) => p.confidence >= CONFIDENCE);
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

    // ── ตรวจผู้เรียก + ความเป็นเจ้าของ report ──
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

    // device hash จาก client เป็น soft signal (ปลอม/ล้างได้) ใช้คู่กับ IP — ไม่รับรูปแบบแปลกๆ
    const rawDevice = typeof body?.deviceHash === "string" ? body.deviceHash.trim().toLowerCase() : "";
    const deviceHash = /^[a-f0-9]{16,64}$/.test(rawDevice) ? rawDevice : null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const { data: report, error: rErr } = await admin
      .from("reports").select("id, user_id, status").eq("id", reportId).single();
    if (rErr || !report) throw new Error("ไม่พบรายงานนี้");
    if (report.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }
    // กันเรียกซ้ำเพื่อปั่นแต้ม
    if (report.status !== "pending" && report.status !== "analyzing") {
      return Response.json(
        { error: `รายงานนี้ถูกตรวจไปแล้ว (${report.status})`, status: report.status },
        { status: 409, headers: corsHeaders },
      );
    }

    const { key: weekKey, startUtc } = isoWeek(new Date());

    // ── บันทึก device signal (ทำก่อนเช็คโควตา เพื่อเก็บหลักฐานการสลับแอคเสมอ) ──
    if (deviceHash) {
      const { data: existing } = await admin.from("device_signals")
        .select("id, report_count").eq("device_hash", deviceHash).eq("user_id", user.id).maybeSingle();
      if (existing) {
        await admin.from("device_signals")
          .update({ last_seen: new Date().toISOString(), ip, report_count: existing.report_count + 1 })
          .eq("id", existing.id);
      } else {
        await admin.from("device_signals")
          .insert({ device_hash: deviceHash, user_id: user.id, ip, report_count: 1 });
      }
      const { data: peers } = await admin.from("device_signals")
        .select("user_id").eq("device_hash", deviceHash);
      const accounts = new Set((peers ?? []).map((p) => p.user_id)).size;
      if (accounts >= SYBIL_ACCOUNTS) {
        await admin.from("device_signals").update({ flagged: true }).eq("device_hash", deviceHash);
      }
    }

    // ── โควตารายสัปดาห์: นับต่อผู้ใช้ และรวมทุกแอคบนเครื่องเดียว (กันแอคหลุม) ──
    const { count: userCount } = await admin.from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startUtc.toISOString())
      .neq("id", reportId);
    let usedThisWeek = userCount ?? 0;
    if (deviceHash) {
      const { data: devRows } = await admin.from("photo_signatures")
        .select("report_id")
        .eq("device_hash", deviceHash)
        .eq("week_key", weekKey)
        .neq("report_id", reportId);
      const devReports = new Set((devRows ?? []).map((r) => r.report_id).filter(Boolean));
      usedThisWeek = Math.max(usedThisWeek, devReports.size);
    }
    if (usedThisWeek >= WEEKLY_LIMIT) {
      await admin.from("reports")
        .update({ status: "rejected", points_awarded: 0, total_points: 0 }).eq("id", reportId);
      const { data: quotaPhotos } = await admin.from("report_photos")
        .select("storage_path").eq("report_id", reportId);
      const paths = (quotaPhotos ?? []).map((p) => p.storage_path).filter(Boolean);
      if (paths.length) await admin.storage.from("trash-photos").remove(paths);
      return Response.json({
        status: "rejected",
        points_awarded: 0,
        error: `ครบโควตา ${WEEKLY_LIMIT} ครั้งของสัปดาห์นี้แล้ว เริ่มนับใหม่วันจันทร์`,
        rejection_reason: `ครบโควตา ${WEEKLY_LIMIT} ครั้งของสัปดาห์นี้แล้ว`,
        quota: { used: usedThisWeek, limit: WEEKLY_LIMIT },
      }, { status: 429, headers: corsHeaders });
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

    // ── โหลดไบต์รูป + คำนวณ dHash ฝั่ง server (client ปลอมค่าไม่ได้) ──
    const targets = photos.slice(0, MAX_PHOTOS);
    const withBytes = await Promise.all(targets.map(async (p) => {
      let bytes: Uint8Array | null = null;
      try {
        const r = await fetch(p.public_url);
        if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
      } catch { /* โหลดไม่ได้ → ตรวจด้วย URL อย่างเดียว */ }
      const phash = bytes ? await dhashHex(bytes) : null;
      return { photo: p, bytes, phash };
    }));

    // ── เทียบกับรูปที่ส่งไปแล้วในสัปดาห์นี้ (ของ user นี้ หรือเครื่องเดียวกัน) ──
    const orFilter = deviceHash
      ? `user_id.eq.${user.id},device_hash.eq.${deviceHash}`
      : `user_id.eq.${user.id}`;
    const { data: priorSigs } = await admin.from("photo_signatures")
      .select("phash, report_id")
      .eq("week_key", weekKey)
      .neq("report_id", reportId)
      .or(orFilter);

    const currentHashes = withBytes.map((r) => r.phash).filter(Boolean) as string[];
    const repeatReports = new Set<string>();
    for (const sig of priorSigs ?? []) {
      if (!sig.phash) continue;
      for (const h of currentHashes) {
        if (hamming(h, sig.phash) <= DHASH_THRESHOLD) {
          repeatReports.add(sig.report_id ?? sig.phash);
          break;
        }
      }
    }
    const repeatCount = repeatReports.size; // สัปดาห์นี้เคยส่งรูปคล้ายกันนี้มาแล้วกี่รายงาน
    const multiplier = repeatCount === 0
      ? 1
      : repeatCount >= SIMILAR_ZERO_AFTER - 1 ? 0 : SIMILAR_PENALTY;

    // ── ตรวจทุกรูปด้วย Roboflow ──
    const perPhoto = await Promise.all(withBytes.map(async (r) => {
      const preds = await detectPhoto(r.photo.public_url, r.bytes);
      const counts = new Map<string, number>();
      for (const d of preds) counts.set(d.class, (counts.get(d.class) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { ...r, preds, counts, top };
    }));

    // ── สรุปผลระดับ report ──
    // รูปทั้งชุดคือจุดขยะเดียวกัน → ใช้จำนวนชิ้นของรูปที่เจอมากสุด ไม่บวกข้ามรูป (กันนับซ้ำ)
    const bestCount = Math.max(...perPhoto.map((r) => r.preds.length), 0);
    const classTotals = new Map<string, number>();
    for (const r of perPhoto)
      for (const [cls, n] of r.counts) classTotals.set(cls, Math.max(classTotals.get(cls) ?? 0, n));
    const primaryClass = [...classTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const approved = bestCount >= 1;
    const basePoints = approved ? scoreFromCount(bestCount) : 0;
    const points = Math.round(basePoints * multiplier);
    const category = primaryClass ? (CATEGORY_MAP[primaryClass] ?? "ขยะทั่วไป") : null;

    // ── เก็บผลลง report_photos ต่อรูป (หมวดไทย เหมือนพฤติกรรมระบบเดิม) ──
    for (const r of perPhoto) {
      await admin.from("report_photos").update({
        trash_type: r.top ? (CATEGORY_MAP[r.top] ?? "ขยะทั่วไป") : null,
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

    // ── เก็บลายเซ็นรูปเฉพาะรายงานที่อนุมัติ (ไว้เทียบครั้งถัดไปของสัปดาห์นี้) ──
    // รายงานที่ถูกปฏิเสธไม่เก็บ เพื่อไม่ลงโทษการถ่ายจุดเดิมใหม่หลัง AI ตรวจพลาด
    if (approved) {
      const sigRows = withBytes
        .filter((r) => r.phash)
        .map((r) => ({
          user_id: user.id,
          report_id: reportId,
          photo_id: r.photo.id,
          phash: r.phash,
          week_key: weekKey,
          device_hash: deviceHash,
          ip,
        }));
      if (sigRows.length) {
        const { error: sigErr } = await admin.from("photo_signatures").insert(sigRows);
        if (sigErr) console.error("เก็บ photo_signatures ไม่สำเร็จ:", sigErr);
      }
    }

    // ── ไม่ผ่าน → ลบรูปออกจาก Storage (พฤติกรรมเดิม) ──
    if (!approved) {
      const paths = photos.map((p) => p.storage_path).filter(Boolean);
      if (paths.length) await admin.storage.from("trash-photos").remove(paths);
    }

    // ── ผ่านและมีแต้ม → เพิ่มแต้มผ่าน RPC (ทางเดียวที่แต้มเข้าบัญชี) ──
    if (approved && points > 0) {
      const { error: rpcErr } = await admin.rpc("increment_user_points", {
        uid: report.user_id,
        pts: points,
      });
      if (rpcErr) console.error("increment_user_points ล้มเหลว:", rpcErr);
    }

    let penaltyNote: string | null = null;
    if (approved && multiplier === 0) {
      penaltyNote = `รูปนี้คล้ายกับที่ส่งไปแล้ว ${repeatCount} ครั้งในสัปดาห์นี้ — ครั้งนี้ไม่ได้รับแต้ม ลองหาจุดขยะใหม่นะ`;
    } else if (approved && multiplier < 1) {
      penaltyNote = `รูปคล้ายกับที่เคยส่งในสัปดาห์นี้ แต้มถูกลด 40% (ได้ ${points} จาก ${basePoints})`;
    }

    const detail = perPhoto
      .map((r, i) => `รูป ${i + 1}: พบ ${r.preds.length} ชิ้น${r.top ? ` (${r.top})` : ""}`)
      .join(", ");

    return Response.json({
      status: approved ? "approved" : "rejected",
      points_awarded: points,
      base_points: basePoints,
      similarity_multiplier: multiplier,
      repeat_count: repeatCount,
      penalty_note: penaltyNote,
      quota: { used: usedThisWeek + 1, limit: WEEKLY_LIMIT },
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
