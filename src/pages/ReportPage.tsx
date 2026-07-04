import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import {
  Camera, MapPin, Trash2, Sparkles, X, Loader2,
  Video as VideoIcon, Rocket, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Pic = { file: File; preview: string; hash?: string };
type Coords = { lat: number; lng: number; accuracy: number };
type Zone = { tambon: string | null; amphoe: string | null; province: string | null };

const MAX = 4;
const MIN = 2;
const DUP_RADIUS_M = 70;            // ภายในรัศมีนี้นับว่าเป็นจุดเดิม
const MAX_DUP_PER_MONTH = 4;        // ส่งซ้ำจุดเดิมได้ไม่เกิน 4 ครั้ง/เดือน
const MAX_GPS_DRIFT_M = 200;        // ระยะระหว่าง GPS รอบ 1 กับ รอบ 2
const MAX_ACCURACY_M = 60;          // accuracy ที่ยอมรับ

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const getGPS = (): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("เบราว์เซอร์ไม่รองรับ GPS"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(e.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });

const compressImage = (file: File, maxWidth = 1280, quality = 0.75): Promise<File> =>
  new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name, { type: "image/jpeg" })),
        "image/jpeg", quality
      );
    };
  });

const hashFile = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const ReportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // mission state
  const [missionStarted, setMissionStarted] = useState(false);
  const [startingMission, setStartingMission] = useState(false);
  const [coords1, setCoords1] = useState<Coords | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);

  const [pics, setPics] = useState<Pic[]>([]);
  const [video, setVideo] = useState<{ file: File; preview: string } | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // GPS diagnostic / last failure reason shown to user
  const [gpsCheck, setGpsCheck] = useState<{ accuracy: number; drift: number | null } | null>(null);
  const [checkingGps, setCheckingGps] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const checkGps = async () => {
    setCheckingGps(true);
    try {
      const c = await getGPS();
      const drift = coords1 ? haversine(coords1, c) : null;
      setGpsCheck({ accuracy: c.accuracy, drift });
    } catch (e: any) {
      setLastError(e.message ?? "ขอ GPS ไม่สำเร็จ");
    } finally {
      setCheckingGps(false);
    }
  };

  const fail = (msg: string) => { setLastError(msg); toast.error(msg); };

  const VIDEO_MAX_BYTES = 8 * 1024 * 1024;
  const VIDEO_MAX_SECONDS = 10;

  const startMission = async () => {
    if (!user) { navigate("/auth"); return; }
    setStartingMission(true);
    try {
      const c = await getGPS();
      if (c.accuracy > MAX_ACCURACY_M * 3) {
        toast.error(`สัญญาณ GPS อ่อนเกินไป (±${Math.round(c.accuracy)}m) ลองออกที่โล่ง`);
        return;
      }
      setCoords1(c);

      // reverse geocode
      const { data, error } = await supabase.functions.invoke("reverse-geocode", {
        body: { lat: c.lat, lng: c.lng },
      });
      if (error) {
        toast.error("หาตำแหน่งตำบลไม่สำเร็จ: " + error.message);
      } else {
        setZone({ tambon: data.tambon, amphoe: data.amphoe, province: data.province });
        toast.success("ปักโซนสำเร็จ 📍");
      }
      setMissionStarted(true);
    } catch (e: any) {
      toast.error(e.message ?? "ขอ GPS ไม่สำเร็จ");
    } finally {
      setStartingMission(false);
    }
  };

  const onVideo = (files: FileList | null) => {
    if (!files?.[0]) return;
    const f = files[0];
    if (!f.type.startsWith("video/")) { toast.error("ต้องเป็นไฟล์วิดีโอ"); return; }
    if (f.size > VIDEO_MAX_BYTES) { toast.error(`วิดีโอใหญ่เกิน ${VIDEO_MAX_BYTES / 1024 / 1024}MB`); return; }
    const url = URL.createObjectURL(f);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      if (el.duration > VIDEO_MAX_SECONDS + 0.5) {
        URL.revokeObjectURL(url);
        toast.error(`วิดีโอยาวเกิน ${VIDEO_MAX_SECONDS} วินาที`);
        return;
      }
      setVideo({ file: f, preview: url });
      toast.success("เพิ่มวิดีโอแล้ว 🎬");
    };
    el.onerror = () => { URL.revokeObjectURL(url); toast.error("อ่านวิดีโอไม่ได้"); };
    el.src = url;
  };

  const removeVideo = () => { if (video) URL.revokeObjectURL(video.preview); setVideo(null); };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, MAX - pics.length);
    const next: Pic[] = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/") || f.size >= 10 * 1024 * 1024) continue;
      const hash = await hashFile(f);
      if (pics.some((p) => p.hash === hash)) { toast.error("รูปนี้ถูกเพิ่มไปแล้ว"); continue; }
      next.push({ file: f, preview: URL.createObjectURL(f), hash });
    }
    setPics((prev) => [...prev, ...next].slice(0, MAX));
  };

  const removePic = (i: number) => {
    setPics((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!coords1) { fail("ยังไม่ได้เริ่มภารกิจ"); return; }
    if (pics.length < MIN) { fail(`ต้องมีรูปอย่างน้อย ${MIN} รูป`); return; }

    setSubmitting(true);
    setLastError(null);
    try {
      // ── GPS รอบ 2 ───────────────────────────────────────────────
      toast.loading("กำลังยืนยันตำแหน่งอีกครั้ง...", { id: "gps2" });
      const c2 = await getGPS();
      toast.dismiss("gps2");

      const drift = haversine(coords1, c2);
      setGpsCheck({ accuracy: c2.accuracy, drift });

      if (c2.accuracy > MAX_ACCURACY_M) {
        fail(`สัญญาณ GPS อ่อนเกินไป (±${Math.round(c2.accuracy)}m, ต้อง ≤${MAX_ACCURACY_M}m) ออกที่โล่งแล้วลองใหม่`);
        return;
      }
      if (drift > MAX_GPS_DRIFT_M) {
        fail(`คุณห่างจากจุดเริ่มภารกิจ ${Math.round(drift)}m (เกิน ${MAX_GPS_DRIFT_M}m) เริ่มภารกิจใหม่`);
        return;
      }

      // ── เช็คจุดซ้ำในเดือนนี้ ─────────────────────────────────────
      const mk = monthKey();
      const { data: myDup } = await supabase
        .from("duplicate_attempts")
        .select("id, lat, lng, attempt_count")
        .eq("user_id", user.id)
        .eq("month_key", mk);

      const samePoint = (myDup ?? []).find(
        (d) => haversine({ lat: d.lat, lng: d.lng }, c2) <= DUP_RADIUS_M
      );
      if (samePoint && samePoint.attempt_count >= MAX_DUP_PER_MONTH) {
        fail(`จุดนี้คุณส่งครบ ${MAX_DUP_PER_MONTH} ครั้งของเดือนนี้แล้ว รอเดือนหน้านะ`);
        return;
      }

      // ── Cooldown (ของเดิม) ──────────────────────────────────────
      const { data: recent } = await supabase
        .from("reports").select("created_at, status")
        .eq("user_id", user.id).order("created_at", { ascending: false })
        .limit(1).single();
      if (recent?.created_at) {
        const diff = Date.now() - new Date(recent.created_at).getTime();
        const cooldown = recent.status === "approved" ? 30 * 60 * 1000 : 3 * 60 * 1000;
        if (diff < cooldown) {
          const remaining = Math.ceil((cooldown - diff) / 60000);
          toast.error(`รอ ${remaining} นาทีก่อนส่งรายงานใหม่`);
          return;
        }
      }

      // ── Insert report ───────────────────────────────────────────
      const { data: report, error: rErr } = await supabase.from("reports").insert({
        user_id: user.id,
        latitude: c2.lat,
        longitude: c2.lng,
        address: address.trim() || null,
        note: note.trim() || null,
        photo_count: pics.length,
        status: "pending",
        tambon: zone?.tambon ?? null,
        amphoe: zone?.amphoe ?? null,
        province: zone?.province ?? null,
        geocode_source: zone ? "nominatim" : null,
      }).select().single();
      if (rErr || !report) throw rErr ?? new Error("create report failed");

      // ── Upload photos ───────────────────────────────────────────
      const photoRows: any[] = [];
      for (let i = 0; i < pics.length; i++) {
        const compressed = await compressImage(pics[i].file);
        const path = `${user.id}/${report.id}/${i}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("trash-photos").upload(path, compressed, {
          contentType: "image/jpeg", upsert: false,
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("trash-photos").getPublicUrl(path);
        photoRows.push({ report_id: report.id, storage_path: path, public_url: publicUrl, display_order: i });
      }
      const { error: phErr } = await supabase.from("report_photos").insert(photoRows);
      if (phErr) throw phErr;

      if (video) {
        const ext = (video.file.name.split(".").pop() || "mp4").toLowerCase();
        const vPath = `${user.id}/${report.id}/video-${Date.now()}.${ext}`;
        const { error: vErr } = await supabase.storage.from("trash-photos").upload(vPath, video.file, {
          contentType: video.file.type || "video/mp4", upsert: false,
        });
        if (vErr) console.warn("video upload failed:", vErr.message);
      }

      // ── อัปเดต duplicate_attempts ───────────────────────────────
      if (samePoint) {
        await supabase.from("duplicate_attempts")
          .update({ attempt_count: samePoint.attempt_count + 1 })
          .eq("id", samePoint.id);
      } else {
        await supabase.from("duplicate_attempts").insert({
          user_id: user.id, lat: c2.lat, lng: c2.lng,
          month_key: mk, attempt_count: 1,
        });
      }

      // ── AI ──────────────────────────────────────────────────────
      toast.loading("AI กำลังวิเคราะห์...", { id: "ai" });
      const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-trash", {
        body: { reportId: report.id },
      });
      toast.dismiss("ai");
      if (aiErr) toast.error("AI วิเคราะห์ไม่สำเร็จ: " + aiErr.message);
      else if (ai?.status === "approved") toast.success(`✅ อนุมัติ! ได้รับ ${ai.points_awarded} แต้ม`);
      else toast.error(`❌ ไม่ผ่าน: ${ai?.rejection_reason ?? "ไม่ใช่รูปขยะที่ตรวจสอบได้"}`);

      navigate("/dashboard");
    } catch (e: any) {
      console.error(e);
      toast.error("ส่งรายงานไม่สำเร็จ: " + (e.message ?? "unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-8">
        <div className="animate-fade-in-up mb-6">
          <h1 className="font-display text-3xl font-extrabold">รายงานจุดขยะ</h1>
          <p className="mt-1 text-ink-soft">เริ่มภารกิจ → ถ่ายรูปสดๆ → AI ตรวจ → ปักหมุดบนแมพ</p>
        </div>

        {/* STEP 1: เริ่มภารกิจ */}
        {!missionStarted ? (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-brand-green" /> เริ่มภารกิจ
              </CardTitle>
              <CardDescription>
                เราจะขอตำแหน่ง GPS ของคุณเพื่อระบุ ตำบล / อำเภอ / จังหวัด ที่กำลังถ่าย
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startMission} disabled={startingMission} variant="hero" size="xl" className="w-full">
                {startingMission ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                {startingMission ? "กำลังขอตำแหน่ง..." : "เริ่มภารกิจ"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Zone summary */}
            <Card className="animate-fade-in-up border-brand-green/30 bg-brand-green/5">
              <CardContent className="flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">โซนที่กำลังถ่าย</p>
                  <p className="text-ink-soft">
                    {zone?.tambon ?? "—"} · {zone?.amphoe ?? "—"} · <span className="font-bold">{zone?.province ?? "—"}</span>
                  </p>
                  {coords1 && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {coords1.lat.toFixed(5)}, {coords1.lng.toFixed(5)} (±{Math.round(coords1.accuracy)}m)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GPS diagnostic */}
            <Card className="mt-4">
              <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <MapPin className="h-5 w-5 shrink-0 text-brand-green" />
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold">ความแม่น GPS</p>
                  {gpsCheck ? (
                    <p className={`text-xs ${gpsCheck.accuracy <= MAX_ACCURACY_M ? "text-brand-green" : "text-red-500"}`}>
                      ±{Math.round(gpsCheck.accuracy)}m
                      {gpsCheck.drift !== null && <> · ห่างจุดเริ่ม {Math.round(gpsCheck.drift)}m</>}
                      {" "}(ต้อง ≤{MAX_ACCURACY_M}m, drift ≤{MAX_GPS_DRIFT_M}m)
                    </p>
                  ) : (
                    <p className="text-xs text-ink-soft">กดตรวจสอบเพื่อดูคุณภาพสัญญาณก่อนส่ง</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={checkGps} disabled={checkingGps}>
                  {checkingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : "ตรวจ GPS"}
                </Button>
              </CardContent>
            </Card>

            {lastError && (
              <Card className="mt-4 border-red-500/40 bg-red-500/5">
                <CardContent className="flex items-start gap-3 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-500">ส่งไม่ผ่าน</p>
                    <p className="text-ink-soft">{lastError}</p>
                  </div>
                  <button onClick={() => setLastError(null)} className="text-ink-soft hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            )}


            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-brand-green" /> รูปขยะ ({pics.length}/{MAX})
                </CardTitle>
                <CardDescription>ถ่ายสดจากกล้องเท่านั้น อย่างน้อย {MIN} ใบ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {pics.map((p, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-ink/10">
                      <img src={p.preview} alt={`pic-${i}`} className="h-full w-full object-cover" />
                      <button onClick={() => removePic(i)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-background hover:bg-ink">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {pics.length < MAX && (
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink-soft hover:border-brand-green hover:text-brand-green">
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
                      <Camera className="h-7 w-7" />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <VideoIcon className="h-5 w-5 text-brand-green" /> วิดีโอ (ไม่บังคับ)
                </CardTitle>
                <CardDescription>คลิปสั้น ≤ {VIDEO_MAX_SECONDS} วินาที / ≤ {VIDEO_MAX_BYTES / 1024 / 1024}MB</CardDescription>
              </CardHeader>
              <CardContent>
                {video ? (
                  <div className="relative overflow-hidden rounded-xl border border-ink/10">
                    <video src={video.preview} controls playsInline className="w-full max-h-64 bg-ink/5" />
                    <button onClick={removeVideo} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-background hover:bg-ink">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/20 px-4 py-6 text-ink-soft hover:border-brand-green hover:text-brand-green">
                    <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => onVideo(e.target.files)} />
                    <VideoIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">เพิ่มวิดีโอสั้น</span>
                  </label>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-green" /> รายละเอียดเพิ่มเติม
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>ที่อยู่ / สถานที่ (ไม่บังคับ)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="เช่น ปากซอยลาดพร้าว 71" />
                </div>
                <div>
                  <Label>หมายเหตุ (ไม่บังคับ)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="ขยะประเภทอะไร เยอะแค่ไหน..." />
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-amber/30 bg-brand-amber-soft/40 p-3 text-xs text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" />
              <p>ตอนกดส่ง เราจะขอ GPS อีกครั้งเพื่อยืนยันตำแหน่ง · จุดเดิม (รัศมี {DUP_RADIUS_M}m) ส่งได้ {MAX_DUP_PER_MONTH} ครั้ง/เดือน</p>
            </div>

            <Button onClick={submit} disabled={submitting || pics.length < MIN} variant="hero" size="xl" className="mt-4 w-full">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {submitting ? "กำลังยืนยันและส่ง..." : "ยืนยันตำแหน่ง & ส่งรายงาน"}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              <Trash2 className="mr-1 inline h-3 w-3" />
              AI จะวิเคราะห์ประเภทขยะและคำนวณแต้มอัตโนมัติ
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportPage;
