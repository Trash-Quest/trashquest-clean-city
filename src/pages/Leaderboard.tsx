import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Crown, Trophy, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Reveal } from "@/components/Reveal";

type Row = {
  user_id: string;
  username: string | null;
  points: number;
  level?: number | null;
};

type Scope = "national" | "province" | "amphoe" | "tambon";

// Row shape returned by the leaderboard_by_location RPC (see contract at call site).
type LocationRpcRow = {
  user_id: string;
  username: string | null;
  points: number;
  rank: number;
};

// What the location board is currently showing, so we can render the right empty state.
type LocalState = "loading" | "need-auth" | "no-zone" | "not-ready" | "empty" | "data";

type Zone = { province: string | null; amphoe: string | null; tambon: string | null };

const Leaderboard = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("national");
  const [zone, setZone] = useState<Zone>({ province: null, amphoe: null, tambon: null });
  const [rows, setRows] = useState<Row[]>([]);
  const [localState, setLocalState] = useState<LocalState>("loading");
  const [loading, setLoading] = useState(true);

  // Derive the signed-in user's area from their most recent geocoded report.
  // RLS lets a user read their own reports, so this works without any backend change.
  useEffect(() => {
    if (!user) {
      setZone({ province: null, amphoe: null, tambon: null });
      return;
    }
    supabase
      .from("reports")
      .select("province, amphoe, tambon")
      .eq("user_id", user.id)
      .or("province.not.is.null,amphoe.not.is.null,tambon.not.is.null")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) =>
        setZone({
          province: data?.province ?? null,
          amphoe: data?.amphoe ?? null,
          tambon: data?.tambon ?? null,
        }),
      );
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      // ---- Global / national board: profiles is world-readable. ----
      if (scope === "national") {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, total_points, level")
          .order("total_points", { ascending: false })
          .limit(100);
        if (cancelled) return;
        setRows(
          (data ?? []).map((d) => ({
            user_id: d.id,
            username: d.username,
            points: d.total_points ?? 0,
            level: d.level,
          })),
        );
        setLocalState("data");
        setLoading(false);
        return;
      }

      // ---- Location boards: aggregate across ALL users. ----
      // reports RLS is owner-only, so this must go through a SECURITY DEFINER
      // RPC (leaderboard_by_location) that is deployed separately. Until it
      // exists, we degrade gracefully rather than crashing.
      const value = zone[scope];
      if (!user) {
        setRows([]);
        setLocalState("need-auth");
        setLoading(false);
        return;
      }
      if (!value) {
        setRows([]);
        setLocalState("no-zone");
        setLoading(false);
        return;
      }

      // Contract (deployed separately, not in generated types yet):
      //   leaderboard_by_location(scope text, value text, limit_count int default 10)
      //   returns rows of (user_id uuid, username text, points bigint, rank bigint)
      // Cast keeps the auto-generated types.ts untouched until the function is regenerated in.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: { scope: Scope; value: string; limit_count: number },
        ) => Promise<{ data: LocationRpcRow[] | null; error: unknown }>
      )("leaderboard_by_location", { scope, value, limit_count: 10 });
      if (cancelled) return;

      if (error) {
        // Function not deployed yet (PGRST202) or any other failure.
        setRows([]);
        setLocalState("not-ready");
        setLoading(false);
        return;
      }

      const mapped: Row[] = (data ?? []).map((d) => ({
        user_id: d.user_id,
        username: d.username,
        points: Number(d.points ?? 0),
      }));
      setRows(mapped);
      setLocalState(mapped.length === 0 ? "empty" : "data");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, zone, user]);

  const zoneLabel = useMemo(() => {
    if (scope === "national") return "ทั่วประเทศ";
    const val = zone[scope];
    if (!val) return "—";
    const prefix = scope === "province" ? "จังหวัด" : scope === "amphoe" ? "อำเภอ" : "ตำบล";
    return `${prefix}${val}`;
  }, [scope, zone]);

  const tabs: { key: Scope; label: string }[] = [
    { key: "national", label: "ทั่วประเทศ" },
    { key: "province", label: "จังหวัด" },
    { key: "amphoe", label: "อำเภอ" },
    { key: "tambon", label: "ตำบล" },
  ];

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  // podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as Row[];
  const podiumHeights = [88, 116, 72]; // matches 2,1,3
  const podiumColor = ["bg-brand-green/80", "bg-brand-amber", "bg-brand-green/60"];

  const emptyMessage = () => {
    switch (localState) {
      case "need-auth":
        return (
          <div className="flex flex-col items-center gap-3">
            <LogIn className="h-8 w-8 text-ink-soft" />
            <p>เข้าสู่ระบบเพื่อดูอันดับในพื้นที่ของคุณ</p>
            <Link to="/auth" className="font-bold text-brand-green">
              เข้าสู่ระบบ →
            </Link>
          </div>
        );
      case "no-zone":
        return (
          <div className="flex flex-col items-center gap-2">
            <MapPin className="h-8 w-8 text-ink-soft" />
            <p>ยังไม่พบข้อมูลพื้นที่จากรายงานของคุณ</p>
            <p className="text-xs">ส่งรายงานที่มีตำแหน่งเพื่อปลดล็อกอันดับในโซนนี้</p>
          </div>
        );
      case "not-ready":
        return (
          <div className="flex flex-col items-center gap-2">
            <Trophy className="h-8 w-8 text-ink-soft" />
            <p>อันดับตามพื้นที่กำลังจะมาเร็ว ๆ นี้</p>
            <p className="text-xs">ระบบจัดอันดับพื้นที่กำลังเตรียมพร้อม</p>
          </div>
        );
      default:
        return <p>ยังไม่มีอันดับในโซนนี้</p>;
    }
  };

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
          </span>{" "}
          ตัวจริง
        </h1>
        <p className="animate-fade-in-up mt-2 text-sm text-ink-soft" style={{ animationDelay: "100ms" }}>เก็บมาก ได้แต้มมาก ขึ้นอันดับเร็ว</p>

        {/* Pill tabs */}
        <div className="mt-6 inline-flex flex-wrap rounded-full border border-border bg-background/70 p-1 backdrop-blur">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setScope(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
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
            <CardContent className="py-12 text-center text-ink-soft">{emptyMessage()}</CardContent>
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
                        <p className="mt-2 line-clamp-1 max-w-full text-center text-sm font-bold">
                          {r.username ?? "นักล่าขยะ"}
                        </p>
                        <p className="text-xs font-extrabold text-brand-green">
                          {r.points.toLocaleString()} pt
                        </p>
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.username ?? "นักล่าขยะ"}</p>
                          {scope === "national" && r.level != null && (
                            <p className="text-xs text-ink-soft">เลเวล {r.level}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-extrabold text-brand-green">
                            {r.points.toLocaleString()}
                          </p>
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
