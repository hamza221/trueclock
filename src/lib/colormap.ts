// Diverging colormap centered on zero. Returns an rgba string.
// blue (negative) → neutral (zero) → red (positive).
// Saturates beyond ±maxAbsMin.
export function deltaColor(deltaMin: number, maxAbsMin = 150): string {
  const t = Math.max(-1, Math.min(1, deltaMin / maxAbsMin));
  // anchor colors
  const neg = [90, 200, 250]; // cool blue
  const mid = [40, 50, 80]; // near-neutral dark
  const pos = [255, 110, 90]; // warm red
  let r: number, g: number, b: number;
  if (t >= 0) {
    r = lerp(mid[0], pos[0], t);
    g = lerp(mid[1], pos[1], t);
    b = lerp(mid[2], pos[2], t);
  } else {
    r = lerp(mid[0], neg[0], -t);
    g = lerp(mid[1], neg[1], -t);
    b = lerp(mid[2], neg[2], -t);
  }
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
