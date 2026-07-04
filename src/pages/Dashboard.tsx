import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, MapPin, PlusCircle, Trophy, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";

type Profile = { username: string | null; total_points: number | null; level: number | null };

type Photo = {
  id: string;
  public_url: string | null;
  photo_url: string | null;
  trash_type: string | null;
  points: number | null;
  display_order: number | null;
};

type Report = {
  id: string;
  created_at: string | null;
  status: string | null;
  points_awarded: number | null;
  total_points: number | null;
  address: string | null;
  display_name: string | null;
  note: string | null;
  photo_count: number;
  province: string | null;
  amphoe: string | null;
  tambon: string | null;
  report_photos: Photo[];
};

const PAGE_SIZE = 10;

const statusBadge = (s: string | null) => {
  if (s === "approved") return { icon: CheckCircle2, cls: "bg-brand-green-soft text-brand-green", label: "อนุมัติ" };
  if (s === "rejected") return { icon: XCircle, cls: "bg-red-100 text-red-700", label: "ไม่ผ่าน" };
  if (s === "analyzing") return { icon: Sparkles, cls: "bg-brand-amber-soft text-brand-amber", label: "AI กำลังตรวจ" };
  return { icon: Clock, cls: "bg-secondary text-ink-soft", label: "รอตรวจ" };
};

const photoSrc = (p: Photo) => p.public_url || p.photo_url || "";

const locationLine = (r: Report) => {
  const parts = [r.tambon, r.amphoe, r.province].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

const REPORT_COLUMNS =
  "id,created_at,status,points_awarded,total_points,address,display_name,note,photo_count,province,amphoe,tambon," +
  "report_photos(id,public_url,photo_url,trash_type,points,display_order)";

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      if (!user) return;
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("reports")
        .select(REPORT_COLUMNS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        setHasMore(false);
        return [] as Report[];
      }
      const rows = (data as unknown as Report[]) ?? [];
      // Sort each report's photos by display_order for a stable thumbnail strip.
      for (const r of rows) {
        r.report_photos = (r.report_photos ?? []).sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
        );
      }
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [user],
  );

  // Initial load: profile, approved-report count, and first page of reports.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: p }, { count }, firstPage] = await Promise.all([
        supabase.from("profiles").select("username,total_points,level").eq("id", user.id).maybeSingle(),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved"),
        fetchPage(0),
      ]);
      if (cancelled) return;
      setProfile((p as Profile) ?? null);
      setApprovedCount(count ?? 0);
      setReports(firstPage);
      setPage(0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    const rows = await fetchPage(next);
    setReports((prev) => [...prev, ...rows]);
    setPage(next);
    setLoadingMore(false);
  };

  const level = profile?.level ?? 1;
  const points = profile?.total_points ?? 0;
  const nextLevelAt = level * 500;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal variant="scale" className="sm:col-span-2">
            <Card className="h-full bg-gradient-to-br from-brand-green to-brand-green/80 text-brand-green-foreground">
              <CardContent className="p-6">
                <p className="text-sm opacity-90">สวัสดี, {profile?.username ?? "นักล่าขยะ"}!</p>
                <CountUp value={points} className="mt-2 block font-display text-5xl font-extrabold" />
                <p className="text-sm opacity-90">แต้มสะสม · Level {level}</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-brand-amber transition-[width] duration-1000 ease-out" style={{ width: `${Math.min(100, (points % 500) / 5)}%` }} />
                </div>
                <p className="mt-1 text-xs opacity-80">เลเวลถัดไปที่ {nextLevelAt} แต้ม</p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col justify-center gap-1 p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-brand-amber" />
                <CountUp value={approvedCount} className="font-display text-3xl font-extrabold" />
                <p className="text-sm text-ink-soft">รายงานที่อนุมัติ</p>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/report">
            <Button variant="hero" size="lg">
              <PlusCircle className="h-5 w-5" />
              รายงานใหม่
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="outline" size="lg">
              <Trophy className="h-5 w-5" />
              อันดับ
            </Button>
          </Link>
        </div>

        <h2 className="mb-4 mt-10 font-display text-2xl font-extrabold">ประวัติรายงาน</h2>
        {loading ? (
          <p className="text-ink-soft">กำลังโหลด...</p>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-ink-soft">
              ยังไม่มีรายงาน{" "}
              <Link to="/report" className="font-bold text-brand-green">
                ส่งรายงานแรกของคุณ →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => {
              const b = statusBadge(r.status);
              const Icon = b.icon;
              const loc = locationLine(r);
              const photos = r.report_photos ?? [];
              return (
                <Reveal key={r.id} delay={Math.min(i, 6) * 70}>
                <Card className="transition duration-300 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MapPin className="h-4 w-4 shrink-0 text-ink-soft" />
                          <span className="truncate">{r.address || r.display_name || "ไม่ระบุที่อยู่"}</span>
                        </CardTitle>
                        {loc && <p className="mt-1 text-xs text-brand-green">{loc}</p>}
                        <p className="mt-1 text-xs text-ink-soft">
                          {r.created_at ? new Date(r.created_at).toLocaleString("th-TH") : "—"} ·{" "}
                          {r.photo_count} รูป
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${b.cls}`}
                      >
                        <Icon className="h-3 w-3" /> {b.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {photos.length > 0 && (
                      <div className="mb-3 flex gap-2 overflow-x-auto">
                        {photos.map((p) => {
                          const src = photoSrc(p);
                          if (!src) return null;
                          return (
                            <div key={p.id} className="relative shrink-0">
                              <img
                                src={src}
                                alt={p.trash_type ?? "รูปรายงาน"}
                                loading="lazy"
                                className="h-20 w-20 rounded-lg border border-border object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              {p.trash_type && (
                                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
                                  {p.trash_type}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {r.status === "approved" && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-extrabold text-brand-amber">
                          +{r.points_awarded ?? 0}
                        </span>
                        <span className="text-xs text-ink-soft">แต้ม</span>
                      </div>
                    )}
                    {r.note && <p className="mt-2 text-sm text-ink-soft">💬 {r.note}</p>}
                  </CardContent>
                </Card>
                </Reveal>
              );
            })}

            {hasMore && (
              <div className="pt-2 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
