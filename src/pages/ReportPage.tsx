import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { Camera, MapPin, Trash2, Sparkles, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Pic = { file: File; preview: string };

const MAX = 4; const MIN = 3;
const ReportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pics, setPics] = useState<Pic[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, MAX - pics.length);
    const next: Pic[] = arr.filter((f) => f.type.startsWith("image/") && f.size < 10 * 1024 * 1024)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPics((prev) => [...prev, ...next].slice(0, MAX));
  };

  const removePic = (i: number) => {
    setPics((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error("เบราว์เซอร์ไม่รองรับ GPS"); return; }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLoadingGeo(false); toast.success("ปักพิกัดสำเร็จ 📍"); },
      (e) => { setLoadingGeo(false); toast.error("ไม่ได้รับสิทธิ์ GPS: " + e.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (pics.length < MIN) { toast.error(`ต้องมีรูปอย่างน้อย ${MIN} รูป`); return; }
    if (!coords) { toast.error("ปักพิกัดก่อนส่ง"); return; }

    setSubmitting(true);
    try {
      // 1) Insert report row
      const { data: report, error: rErr } = await supabase.from("reports").insert({
        user_id: user.id,
        latitude: coords.lat,
        longitude: coords.lng,
        address: address.trim() || null,
        note: note.trim() || null,
        photo_count: pics.length,
        status: "pending",
      }).select().single();
      if (rErr || !report) throw rErr ?? new Error("create report failed");

      // 2) Upload photos
      const photoRows: any[] = [];
      for (let i = 0; i < pics.length; i++) {
        const ext = pics[i].file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${report.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("trash-photos").upload(path, pics[i].file, {
          contentType: pics[i].file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("trash-photos").getPublicUrl(path);
        photoRows.push({ report_id: report.id, storage_path: path, public_url: publicUrl, display_order: i });
      }
      const { error: phErr } = await supabase.from("report_photos").insert(photoRows);
      if (phErr) throw phErr;

      // 3) Trigger AI analysis
      toast.loading("AI กำลังวิเคราะห์...", { id: "ai" });
      const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-trash", { body: { reportId: report.id } });
      toast.dismiss("ai");
      if (aiErr) {
        toast.error("AI วิเคราะห์ไม่สำเร็จ: " + aiErr.message);
      } else if (ai?.status === "approved") {
        toast.success(`✅ อนุมัติ! ได้รับ ${ai.points_awarded} แต้ม`);
      } else {
        toast.error(`❌ ไม่ผ่าน: ${ai?.rejection_reason ?? "ไม่ใช่รูปขยะที่ตรวจสอบได้"}`);
      }
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
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold">รายงานจุดขยะ</h1>
          <p className="mt-1 text-ink-soft">ถ่ายรูป {MIN}-{MAX} ใบ + ปักพิกัด → AI ตรวจ → รับแต้ม</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-brand-green" />รูปขยะ ({pics.length}/{MAX})</CardTitle>
            <CardDescription>ถ่ายให้เห็นกองขยะชัดเจน อย่างน้อย {MIN} ใบ</CardDescription>
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
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-green" />พิกัดและรายละเอียด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button onClick={getLocation} disabled={loadingGeo} variant={coords ? "outline" : "hero"}>
                {loadingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                {coords ? "อัปเดตตำแหน่ง" : "ใช้ตำแหน่งปัจจุบัน"}
              </Button>
              {coords && (
                <span className="text-xs text-ink-soft">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              )}
            </div>
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

        <Button onClick={submit} disabled={submitting || pics.length < MIN || !coords} variant="hero" size="xl" className="mt-6 w-full">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {submitting ? "กำลังส่งและวิเคราะห์..." : "ส่งรายงาน + ให้ AI ตรวจ"}
        </Button>
        <p className="mt-3 text-center text-xs text-ink-soft">
          <Trash2 className="mr-1 inline h-3 w-3" />
          AI จะวิเคราะห์ประเภทขยะและคำนวณแต้มอัตโนมัติ
        </p>
      </main>
    </div>
  );
};

export default ReportPage;
