import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type HeroStats = {
  pointsToday: number;
  reportsToday: number;
  loading: boolean;
};

/** Real-time-ish (fetched once per page load) counts of today's approved reports/points, for the homepage Hero. */
export function useHeroStats(): HeroStats {
  const [pointsToday, setPointsToday] = useState(0);
  const [reportsToday, setReportsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    (async () => {
      try {
        const [{ count }, { data: pointsRows }] = await Promise.all([
          supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved")
            .gte("created_at", startOfDay.toISOString()),
          supabase
            .from("reports")
            .select("points_awarded")
            .eq("status", "approved")
            .gte("created_at", startOfDay.toISOString()),
        ]);

        if (cancelled) return;
        setReportsToday(count ?? 0);
        setPointsToday((pointsRows ?? []).reduce((s, r) => s + (r.points_awarded ?? 0), 0));
      } catch {
        if (!cancelled) {
          setReportsToday(0);
          setPointsToday(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pointsToday, reportsToday, loading };
}
