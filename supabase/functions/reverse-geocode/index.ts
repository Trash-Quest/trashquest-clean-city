// Reverse geocode lat/lng → tambon/amphoe/province via Nominatim (OpenStreetMap)
// Public function — no JWT required.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat and lng (number) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", "th");
    url.searchParams.set("zoom", "14");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TrashQuest/1.0 (lovable.app)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `Nominatim ${res.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const a = data.address || {};

    // Thai admin levels can land in different fields depending on area type.
    const tambon =
      a.suburb || a.village || a.neighbourhood || a.quarter || a.hamlet ||
      a.subdistrict || a.town || null;
    const amphoe =
      a.city_district || a.district || a.county || a.municipality || a.city || null;
    const province = a.province || a.state || null;

    return new Response(
      JSON.stringify({
        tambon,
        amphoe,
        province,
        display_name: data.display_name || null,
        raw: a,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
