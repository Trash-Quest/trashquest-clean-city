import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, MapPin, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Reveal } from "@/components/Reveal";

type Row = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  total_reports: number;
};

type Scope = "tambon" | "province" | "national";

const Leaderboard = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("national");
  const [myZone, setMyZone] = useState<{ tambon: string | null; province: string | null }>({ tambon: null, province: null });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("reports").select("tambon, province")
      .eq("user_id", user.id).not("province", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setMyZone({ tambon: data?.tambon ?? null, province: data?.province ?? null }));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      if (scope === "national") {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, total_points, total_reports")
          .order("total_points", { ascending: false })
          .limit(100);
        setRows((data ?? []).map((d: any) => ({
          user_id: d.id, display_name: d.display_name,
          total_points: d.total_points ?? 0, total_reports: d.total_reports ?? 0,
        })));
      } else {
        const filterKey = scope === "tambon" ? "tambon" : "province";
        const filterVal = scope === "tambon" ? myZone.tambon : myZone.province;
        if (!filterVal) { setRows([]); setLoading(false); return; }

        const { data: reports } = await supabase
          .from("reports")
          .select("user_id, points_awarded")
          .eq("status", "approved")
          .eq(filterKey, filterVal)
          .limit(5000);

        const tally = new Map<string, { points: number; count: number }>();
        for (const r of (reports as any[]) ?? []) {
          const cur = tally.get(r.user_id) ?? { points: 0, count: 0 };
          cur.points += r.points_awarded ?? 0;
          cur.count += 1;
          tally.set(r.user_id, cur);
        }
        const userIds = Array.from(tally.keys());
        if (userIds.length === 0) { setRows([]); setLoading(false); return; }

        const { data: profs } = await supabase
          .from("profiles").select("id, display_name").in("id", userIds);
        const nameOf = new Map((profs ?? []).map((p: any) => [p.id, p.display_name]));

        const ranked = userIds
          .map((uid) => ({
            user_id: uid,
            display_name: nameOf.get(uid) ?? "นักล่าขยะ",
            total_points: tally.get(uid)!.points,
            total_reports: tally.get(uid)!.count,
          }))
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 100);
        setRows(ranked);
      }
      setLoading(false);
    })();
  }, [scope, myZone]);

  const zoneLabel = useMemo(() => {
    if (scope === "national") return "ทั่วประเทศ";
    if (scope === "tambon") return myZone.tambon ? `ตำบล${myZone.tambon}` : "—";
    return myZone.province ? `จังหวัด${myZone.province}` : "—";
  }, [scope, myZone]);

  const tabs: { key: Scope; label: string; disabled?: boolean }[] = [
    { key: "tambon", label: "ตำบล", disabled: !myZone.tambon },
    { key: "province", label: "จังหวัด", disabled: !myZone.province },
    { key: "national", label: "ทั่วประเทศ" },
  ];

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  // podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as Row[];
  const podiumHeights = [88, 116, 72]; // matches 2,1,3
  const podiumColor = ["bg-brand-green/80", "bg-brand-amber", "bg-brand-green/60"];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-trash-pattern opacity-60" aria-hidden />
      <div className="animate-blob pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-brand-green/15 blur-3xl" aria-hidden />
      <div className="animate-blob pointer-events-none absolute -right-32 top-96 h-80 w-80 rounded-full bg-brand-amber/15 blur-3xl" style={{ animationDelay: "-4.5s" }} aria-hidden />

      <AppHeader />

      <main className="container relative max-w-3xl py-8">
        {/* Header pill */}
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-amber/40 bg-background/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-amber backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" /> Leaderboard
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-3 py-1.5 text-xs font-semibold text-brand-green">
            <MapPin className="h-3 w-3" /> {zoneLabel}
          </span>
        </div>

        <h1 className="animate-fade-in-up font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          นัก<span className="relative inline-block">
            <span className="relative z-10">ล่าขยะ</span>
            <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-brand-amber/60" aria-hidden />
          </span> ตัวจริง
        </h1>
        <p className="animate-fade-in-up mt-2 text-sm text-ink-soft" style={{ animationDelay: "100ms" }}>เก็บมาก ได้แต้มมาก ขึ้นอันดับเร็ว</p>

        {/* Pill tabs */}
        <div className="mt-6 inline-flex rounded-full border border-border bg-background/70 p-1 backdrop-blur">
          {tabs.map((t) => (
            <button
              key={t.key}
              disabled={t.disabled}
              onClick={() => setScope(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
                scope === t.key
                  ? "bg-brand-green text-brand-green-foreground shadow"
                  : "text-ink-soft hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-ink-soft">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-ink-soft">ยังไม่มีอันดับในโซนนี้</CardContent>
          </Card>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="mt-8 rounded-3xl border border-border bg-card/70 p-4 backdrop-blur sm:p-6">
                <div className="flex items-end justify-center gap-3 sm:gap-5">
                  {podium.map((r, idx) => {
                    const realRank = r === top3[0] ? 1 : r === top3[1] ? 2 : 3;
                    const isFirst = realRank === 1;
                    return (
                      <Reveal key={r.user_id} variant="up" delay={idx * 140} className="flex w-1/3 flex-col items-center">
                        {isFirst && <Crown className="mb-1 h-5 w-5 text-brand-amber animate-float" />}
                        <div className={`grid h-14 w-14 place-items-center rounded-full border-2 ${isFirst ? "border-brand-amber" : "border-brand-green/60"} bg-background font-display text-lg font-extrabold`}>
                          {realRank}
                        </div>
                        <p className="mt-2 line-clamp-1 max-w-full text-center text-sm font-bold">{r.display_name ?? "นักล่าขยะ"}</p>
                        <p className="text-xs text-brand-green font-extrabold">{r.total_points.toLocaleString()} pt</p>
                        <div
                          className={`mt-2 w-full origin-bottom rounded-t-xl ${podiumColor[idx]}`}
                          style={{ height: podiumHeights[idx] }}
                        />
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rest */}
            {rest.length > 0 && (
              <div className="mt-4 space-y-2">
                {rest.map((r, i) => {
                  const rank = i + 4;
                  return (
                    <Reveal key={r.user_id} delay={Math.min(i, 8) * 60}>
                    <Card className="border-border/60 bg-card/70 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary font-display font-bold text-ink-soft">
                          {rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold">{r.display_name ?? "นักล่าขยะ"}</p>
                          <p className="text-xs text-ink-soft">{r.total_reports} รายงาน</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-extrabold text-brand-green">{r.total_points.toLocaleString()}</p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-soft">แต้ม</p>
                        </div>
                      </CardContent>
                    </Card>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
