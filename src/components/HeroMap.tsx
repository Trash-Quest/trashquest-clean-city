import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import heroPhone from "@/assets/hero-phone.png";

type Pin = {
  id: string;
  latitude: number;
  longitude: number;
};

const BANGKOK: [number, number] = [13.7563, 100.5018];

export function HeroMap() {
  const [pins, setPins] = useState<Pin[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("id, latitude, longitude")
          .eq("status", "approved")
          .not("latitude", "is", null)
          .order("created_at", { ascending: false })
          .limit(60);

        if (cancelled) return;
        if (error) throw error;
        setPins((data as Pin[]) ?? []);
      } catch {
        if (!cancelled) setPins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pins === null) {
    return (
      <div className="relative z-10 mx-auto h-72 w-full max-w-md animate-pulse rounded-[3rem] bg-brand-green/10 sm:h-80" />
    );
  }

  if (pins.length === 0) {
    return (
      <img
        src={heroPhone}
        alt="แผนที่จุดขยะและคุณภาพอากาศในแอป TrashQuest"
        width={1024}
        height={1024}
        className="relative z-10 mx-auto w-full max-w-md drop-shadow-2xl"
      />
    );
  }

  const center: [number, number] = [pins[0].latitude, pins[0].longitude];

  return (
    <div className="relative z-10 mx-auto h-72 w-full max-w-md overflow-hidden rounded-[3rem] shadow-2xl sm:h-80">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle={true}
          keepBuffer={2}
        />
        {pins.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={7}
            pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.75, weight: 2 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
