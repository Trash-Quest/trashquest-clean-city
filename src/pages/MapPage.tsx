import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  tambon: string | null;
  amphoe: string | null;
  province: string | null;
  primary_trash_type: string | null;
  points_awarded: number | null;
  created_at: string;
  user_id: string;
};

type Scope = "mine" | "tambon" | "province";

const Recenter = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 14); }, [center, map]);
  return null;
};

const MapPage = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("mine");
  const [pins, setPins] = useState<Pin[]>([]);
  const [myZone, setMyZone] = useState<{ tambon: string | null; province: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // หาโซนล่าสุดของผู้ใช้
      const { data: last } = await supabase
        .from("reports")
        .select("tambon, province")
        .eq("user_id", user.id)
        .not("province", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setMyZone(last ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("reports")
      .select("id, latitude, longitude, tambon, amphoe, province, primary_trash_type, points_awarded, created_at, user_id")
      .eq("status", "approved")
      .not("latitude", "is", null);

    if (scope === "mine") q = q.eq("user_id", user.id);
    else if (scope === "tambon" && myZone?.tambon) q = q.eq("tambon", myZone.tambon);
    else if (scope === "province" && myZone?.province) q = q.eq("province", myZone.province);

    q.order("created_at", { ascending: false }).limit(500).then(({ data }) => {
      setPins((data as Pin[]) ?? []);
      setLoading(false);
    });
  }, [scope, user, myZone]);

  const center = useMemo<[number, number] | null>(() => {
    if (pins.length > 0) return [pins[0].latitude, pins[0].longitude];
    return [13.7563, 100.5018]; // Bangkok default
  }, [pins]);

  const colorFor = (p: Pin) =>
    p.user_id === user?.id ? "#16a34a" : "#0ea5e9";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-5xl py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green text-brand-green-foreground">
            <MapPin className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold">แผนที่ภารกิจ</h1>
            <p className="text-sm text-ink-soft">
              {myZone?.tambon || myZone?.province
                ? <>โซนของคุณ: {myZone?.tambon ?? "—"} · {myZone?.province ?? "—"}</>
                : "ยังไม่มีโซน — ลองส่งรายงานก่อน"}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={scope === "mine" ? "hero" : "outline"} size="sm" onClick={() => setScope("mine")}>ของฉัน</Button>
          <Button variant={scope === "tambon" ? "hero" : "outline"} size="sm" onClick={() => setScope("tambon")} disabled={!myZone?.tambon}>ทั้งตำบล</Button>
          <Button variant={scope === "province" ? "hero" : "outline"} size="sm" onClick={() => setScope("province")} disabled={!myZone?.province}>ทั้งจังหวัด</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="relative h-[60vh] w-full overflow-hidden rounded-xl">
              {loading && (
                <div className="absolute inset-0 z-[400] grid place-items-center bg-background/60 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
                </div>
              )}
              <MapContainer center={center ?? [13.7563, 100.5018]} zoom={13} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Recenter center={center} />
                {pins.map((p) => (
                  <CircleMarker
                    key={p.id}
                    center={[p.latitude, p.longitude]}
                    radius={9}
                    pathOptions={{ color: colorFor(p), fillColor: colorFor(p), fillOpacity: 0.7, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <p className="font-semibold">{p.tambon ?? "ไม่ระบุตำบล"} · {p.province ?? "—"}</p>
                        <p>ประเภท: {p.primary_trash_type ?? "—"}</p>
                        <p>แต้ม: {p.points_awarded ?? 0}</p>
                        <p className="opacity-70">{new Date(p.created_at).toLocaleString("th-TH")}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        <p className="mt-3 text-center text-xs text-ink-soft">
          🟢 หมุดของคุณ · 🔵 หมุดของผู้ใช้คนอื่นในโซนเดียวกัน
        </p>
      </main>
    </div>
  );
};

export default MapPage;
