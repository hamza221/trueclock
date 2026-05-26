// Reverse geocoding via Nominatim (OSM). Be polite: identify ourselves,
// cap calls. For higher volume in production you'd self-host.
export interface PlaceName {
  city?: string;
  region?: string;
  country?: string;
  display?: string;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<PlaceName> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const j = await res.json();
  const a = j.address ?? {};
  return {
    city: a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality,
    region: a.state ?? a.region,
    country: a.country,
    display: j.display_name,
  };
}
