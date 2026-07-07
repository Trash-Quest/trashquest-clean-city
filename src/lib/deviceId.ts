// รหัสประจำเครื่องแบบไม่ระบุตัวตน — ส่งไปกับการวิเคราะห์รายงานให้ฝั่ง server
// ใช้จับแอคหลุม (หลายบัญชีบนเครื่องเดียวแชร์โควตารายสัปดาห์เดียวกัน)
// เป็น soft signal: ผู้ใช้ล้าง localStorage ได้ แต่ fingerprint เดิมจะให้ค่าเดิม

const KEY = "tq_device_id";

const fingerprint = (): string => {
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(navigator.hardwareConcurrency ?? ""),
  ];
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 120, 30);
      ctx.fillStyle = "#069";
      ctx.fillText("TrashQuest🗑️", 2, 8);
      parts.push(c.toDataURL());
    }
  } catch {
    /* canvas ถูกบล็อก → ใช้ส่วนที่เหลือ */
  }
  return parts.join("|");
};

export const getDeviceHash = async (): Promise<string | null> => {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached && /^[a-f0-9]{64}$/.test(cached)) return cached;
    const buf = new TextEncoder().encode(fingerprint());
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(KEY, hex);
    return hex;
  } catch {
    return null; // ไม่มี crypto/localStorage → ฝั่ง server จะนับตาม user อย่างเดียว
  }
};
