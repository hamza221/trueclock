// Reverse and forward geocoding via Nominatim (OSM). Be polite: identify
// ourselves, cap calls. For higher volume in production you'd self-host.
export interface PlaceName {
  city?: string;
  region?: string;
  country?: string;
  display?: string;
}

export interface PlaceHit {
  lat: number;
  lon: number;
  display: string;
  name: string;
  country?: string;
  region?: string;
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

export async function searchCity(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&addressdetails=1&limit=6&featuretype=city` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const arr = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    address?: Record<string, string>;
  }>;
  return arr.map((j) => {
    const a = j.address ?? {};
    const name =
      j.name ??
      a.city ??
      a.town ??
      a.village ??
      a.hamlet ??
      a.municipality ??
      a.county ??
      j.display_name.split(',')[0]!;
    return {
      lat: parseFloat(j.lat),
      lon: parseFloat(j.lon),
      display: j.display_name,
      name,
      region: a.state ?? a.region,
      country: a.country,
    };
  });
}

