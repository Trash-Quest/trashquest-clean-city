// analyze-trash-roboflow — ปิดใช้งานถาวร (tombstone)
// ตัวเดิมไม่ตรวจ auth/ความเป็นเจ้าของ และเรียกซ้ำปั่นแต้มได้ → แทนที่ด้วย analyze-trash (v14)
// คงไฟล์นี้ไว้ให้ตรงกับตัวที่ deploy เพื่อกันใครเผลอเรียก endpoint เก่า
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return Response.json(
    { error: "ฟังก์ชันนี้ถูกปิดใช้งานแล้ว (แทนที่ด้วย analyze-trash)" },
    { status: 410, headers: corsHeaders },
  );
});
