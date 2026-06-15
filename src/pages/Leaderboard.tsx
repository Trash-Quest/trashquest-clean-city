import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Row = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  total_reports: number;
};

type Scope = "tambon" | "province" | "national";

const medalFor = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

const Leaderboard = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("national");
  const [myZone, setMyZone] = useState<{ tambon: string | null; province: string | null }>({ tambon: null, province: null });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // หาโซนของผู้ใช้จาก report ล่าสุด
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

        // รวมแต้มจาก reports ของโซนนี้
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-amber text-brand-amber-foreground"><Trophy className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
            <p className="text-sm text-ink-soft">นักล่าขยะที่เก่งที่สุด · {zoneLabel}</p>
          </div>
        </div>

        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tambon" disabled={!myZone.tambon}>ตำบล</TabsTrigger>
            <TabsTrigger value="province" disabled={!myZone.province}>จังหวัด</TabsTrigger>
            <TabsTrigger value="national">ทั่วประเทศ</TabsTrigger>
          </TabsList>
          <TabsContent value={scope} />
        </Tabs>

        {loading ? (
          <p className="text-ink-soft">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-ink-soft">ยังไม่มีอันดับในโซนนี้</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <Card key={r.user_id} className={i < 3 ? "border-brand-amber/40" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-xl font-extrabold ${i < 3 ? "bg-brand-amber-soft" : "bg-secondary"}`}>
                    {medalFor(i)}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold">{r.display_name ?? "นักล่าขยะ"}</p>
                    <p className="text-xs text-ink-soft">{r.total_reports} รายงาน</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold text-brand-green">{r.total_points.toLocaleString()}</p>
                    <p className="text-xs text-ink-soft">แต้ม</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
