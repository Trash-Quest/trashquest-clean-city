import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, MapPin, PlusCircle, Trophy, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";

type Profile = { display_name: string; total_points: number; total_reports: number; level: number };
type Report = {
  id: string; created_at: string; status: string; points_awarded: number;
  primary_trash_type: string | null; estimated_items: number; ai_summary: string | null;
  ai_rejection_reason: string | null; address: string | null; photo_count: number;
};

const statusBadge = (s: string) => {
  if (s === "approved") return { icon: CheckCircle2, cls: "bg-brand-green-soft text-brand-green", label: "อนุมัติ" };
  if (s === "rejected") return { icon: XCircle, cls: "bg-red-100 text-red-700", label: "ไม่ผ่าน" };
  if (s === "analyzing") return { icon: Sparkles, cls: "bg-brand-amber-soft text-brand-amber", label: "AI กำลังตรวจ" };
  return { icon: Clock, cls: "bg-secondary text-ink-soft", label: "รอตรวจ" };
};

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("display_name,total_points,total_reports,level").eq("id", user.id).maybeSingle(),
        supabase.from("reports").select("id,created_at,status,points_awarded,primary_trash_type,estimated_items,ai_summary,ai_rejection_reason,address,photo_count").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setProfile(p as Profile);
      setReports((r as Report[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const nextLevelAt = profile ? profile.level * 500 : 500;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal variant="scale" className="sm:col-span-2">
            <Card className="h-full bg-gradient-to-br from-brand-green to-brand-green/80 text-brand-green-foreground">
              <CardContent className="p-6">
                <p className="text-sm opacity-90">สวัสดี, {profile?.display_name ?? "นักล่าขยะ"}!</p>
                <CountUp value={profile?.total_points ?? 0} className="mt-2 block font-display text-5xl font-extrabold" />
                <p className="text-sm opacity-90">แต้มสะสม · Level {profile?.level ?? 1}</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-brand-amber transition-[width] duration-1000 ease-out" style={{ width: `${Math.min(100, ((profile?.total_points ?? 0) % 500) / 5)}%` }} />
                </div>
                <p className="mt-1 text-xs opacity-80">เลเวลถัดไปที่ {nextLevelAt} แต้ม</p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col justify-center gap-1 p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-brand-amber" />
                <CountUp value={profile?.total_reports ?? 0} className="font-display text-3xl font-extrabold" />
                <p className="text-sm text-ink-soft">รายงานที่อนุมัติ</p>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/report"><Button variant="hero" size="lg"><PlusCircle className="h-5 w-5" />รายงานใหม่</Button></Link>
          <Link to="/leaderboard"><Button variant="outline" size="lg"><Trophy className="h-5 w-5" />อันดับ</Button></Link>
        </div>

        <h2 className="mt-10 mb-4 font-display text-2xl font-extrabold">ประวัติรายงาน</h2>
        {loading ? (
          <p className="text-ink-soft">กำลังโหลด...</p>
        ) : reports.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-ink-soft">
            ยังไม่มีรายงาน <Link to="/report" className="font-bold text-brand-green">ส่งรายงานแรกของคุณ →</Link>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => {
              const b = statusBadge(r.status); const Icon = b.icon;
              return (
                <Reveal key={r.id} delay={Math.min(i, 6) * 70}>
                <Card className="transition duration-300 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-ink-soft" />
                          {r.address || "ไม่ระบุที่อยู่"}
                        </CardTitle>
                        <p className="mt-1 text-xs text-ink-soft">
                          {new Date(r.created_at).toLocaleString("th-TH")} · {r.photo_count} รูป
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${b.cls}`}>
                        <Icon className="h-3 w-3" /> {b.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {r.status === "approved" && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-extrabold text-brand-amber">+{r.points_awarded}</span>
                        <span className="text-xs text-ink-soft">แต้ม · {r.estimated_items} ชิ้น · {r.primary_trash_type}</span>
                      </div>
                    )}
                    {r.ai_summary && <p className="mt-2 text-sm text-ink-soft">💬 {r.ai_summary}</p>}
                    {r.ai_rejection_reason && <p className="mt-2 text-sm text-red-600">⚠️ {r.ai_rejection_reason}</p>}
                  </CardContent>
                </Card>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
