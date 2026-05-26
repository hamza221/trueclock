// Location acquisition: browser geolocation first, IP fallback.
import tzlookup from 'tz-lookup';

export interface LocationFix {
  lat: number;
  lon: number;
  source: 'browser' | 'ip' | 'manual';
  accuracyKm?: number;
}

export async function getBrowserLocation(): Promise<LocationFix> {
  if (!('geolocation' in navigator)) {
    throw new Error('geolocation unsupported');
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          source: 'browser',
          accuracyKm: p.coords.accuracy / 1000,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export async function getIpLocation(): Promise<LocationFix> {
  // ipapi.co is free, no key, reasonable city-level accuracy.
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) throw new Error(`ipapi ${res.status}`);
  const j = await res.json();
  if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number')
    throw new Error('ipapi: missing coords');
  return { lat: j.latitude, lon: j.longitude, source: 'ip' };
}

export async function resolveLocation(): Promise<LocationFix> {
  try {
    return await getBrowserLocation();
  } catch {
    return await getIpLocation();
  }
}

export function tzFromLatLon(lat: number, lon: number): string {
  try {
    return tzlookup(lat, lon);
  } catch {
    return 'UTC';
  }
}
