/* Generated artwork for the preview page: posters, UI cards, type specimens and palettes,
   so the sample board looks like a real inspiration feed without using anyone's posts. */

type Art = (w: number, h: number, a: string, b: string, c: string, label: string) => string;

const svg = (w: number, h: number, body: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

const sans = "font-family='Helvetica Neue, Helvetica, Arial, sans-serif'";
const serif = "font-family='Georgia, Times New Roman, serif'";

const mesh: Art = (w, h, a, b, c, label) =>
  svg(w, h, `<defs><radialGradient id='g1' cx='25%' cy='30%' r='70%'><stop offset='0' stop-color='${b}'/><stop offset='1' stop-color='${b}' stop-opacity='0'/></radialGradient><radialGradient id='g2' cx='80%' cy='75%' r='65%'><stop offset='0' stop-color='${c}'/><stop offset='1' stop-color='${c}' stop-opacity='0'/></radialGradient><filter id='n'><feTurbulence baseFrequency='.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter></defs>
  <rect width='100%' height='100%' fill='${a}'/><rect width='100%' height='100%' fill='url(#g1)'/><rect width='100%' height='100%' fill='url(#g2)'/><rect width='100%' height='100%' filter='url(#n)'/>
  <text x='${w * 0.07}' y='${h * 0.9}' ${sans} font-weight='600' font-size='${Math.min(w, h) * 0.1}' fill='white' letter-spacing='-2'>${label}</text>`);

const swiss: Art = (w, h, a, b, c, label) => {
  const u = w / 12;
  return svg(w, h, `<rect width='100%' height='100%' fill='${a}'/>
  <rect x='${u}' y='${u}' width='${u * 6}' height='${u * 6}' fill='${b}'/><circle cx='${u * 8.5}' cy='${u * 7.5}' r='${u * 2.6}' fill='${c}'/>
  <rect x='${u}' y='${h - u * 4.2}' width='${w - 2 * u}' height='2' fill='${b}'/>
  <text x='${u}' y='${h - u * 2.4}' ${sans} font-weight='700' font-size='${u * 1.25}' fill='${b}' letter-spacing='-1'>${label}</text>
  <text x='${u}' y='${h - u * 1.2}' ${sans} font-size='${u * 0.42}' fill='${b}' opacity='.7'>Kunstgewerbemuseum · 1958 · Ausstellung</text>`);
};

const ui: Art = (w, h, a, b, c, label) => {
  const p = w * 0.08;
  const cw = w - p * 2;
  return svg(w, h, `<rect width='100%' height='100%' fill='${a}'/>
  <rect x='${p}' y='${p}' width='${cw}' height='${h - p * 2}' rx='${w * 0.05}' fill='white'/>
  <circle cx='${p * 2}' cy='${p * 2}' r='${w * 0.035}' fill='${b}'/><rect x='${p * 2.7}' y='${p * 1.75}' width='${cw * 0.4}' height='${w * 0.025}' rx='4' fill='#1b1b1a'/>
  <rect x='${p * 2.7}' y='${p * 2.3}' width='${cw * 0.25}' height='${w * 0.02}' rx='4' fill='#b9b6ae'/>
  <rect x='${p * 1.5}' y='${p * 3.3}' width='${cw - p}' height='${h * 0.32}' rx='${w * 0.03}' fill='${c}'/>
  <text x='${p * 2}' y='${p * 3.3 + h * 0.2}' ${sans} font-weight='600' font-size='${w * 0.07}' fill='white'>${label}</text>
  ${[0, 1, 2].map((i) => `<rect x='${p * 1.5}' y='${p * 4 + h * 0.32 + i * w * 0.09}' width='${cw - p}' height='${w * 0.06}' rx='${w * 0.02}' fill='#f1efea'/>`).join('')}
  <rect x='${p * 1.5}' y='${h - p * 2.6}' width='${cw - p}' height='${w * 0.09}' rx='${w * 0.045}' fill='${b}'/>`);
};

const specimen: Art = (w, h, a, b, c, label) =>
  svg(w, h, `<rect width='100%' height='100%' fill='${a}'/>
  <text x='${w * 0.08}' y='${h * 0.55}' ${serif} font-size='${Math.min(w, h) * 0.5}' fill='${b}' letter-spacing='-6'>Aa</text>
  <text x='${w * 0.08}' y='${h * 0.72}' ${sans} font-weight='600' font-size='${w * 0.05}' fill='${b}'>${label}</text>
  <text x='${w * 0.08}' y='${h * 0.8}' ${sans} font-size='${w * 0.032}' fill='${b}' opacity='.6'>Regular · Italic · Medium · Bold</text>
  <text x='${w * 0.08}' y='${h * 0.9}' ${serif} font-size='${w * 0.034}' fill='${c}'>ABCDEFGHIJKLM abcdefghijklm 0123456789</text>`);

const palette: Art = (w, h, a, b, c, label) => {
  const cols = [a, b, c, '#efe9df', '#1d1c1a'];
  const sw = w / cols.length;
  return svg(w, h, `${cols.map((col, i) => `<rect x='${i * sw}' width='${sw + 1}' height='${h}' fill='${col}'/>`).join('')}
  <rect y='${h * 0.78}' width='${w}' height='${h * 0.22}' fill='white'/>
  <text x='${w * 0.05}' y='${h * 0.9}' ${sans} font-weight='600' font-size='${h * 0.05}' fill='#1d1c1a'>${label}</text>
  <text x='${w * 0.05}' y='${h * 0.96}' font-family='ui-monospace, Menlo, monospace' font-size='${h * 0.03}' fill='#77746c'>${cols.slice(0, 3).join('  ')}</text>`);
};

const motion: Art = (w, h, a, b, c, label) => {
  const n = 7;
  const step = (w * 0.84) / (n - 1);
  return svg(w, h, `<rect width='100%' height='100%' fill='${a}'/>
  <path d='M ${w * 0.08} ${h * 0.62} C ${w * 0.35} ${h * 0.62}, ${w * 0.45} ${h * 0.25}, ${w * 0.92} ${h * 0.25}' stroke='${c}' stroke-width='2' fill='none' stroke-dasharray='4 6'/>
  ${Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const e = 1 - Math.pow(1 - t, 3);
    return `<circle cx='${w * 0.08 + i * step}' cy='${h * 0.62 - e * h * 0.37}' r='${w * 0.035}' fill='${b}' opacity='${0.25 + t * 0.75}'/>`;
  }).join('')}
  <text x='${w * 0.08}' y='${h * 0.88}' font-family='ui-monospace, Menlo, monospace' font-size='${w * 0.035}' fill='${b}'>${label}</text>`);
};

const brand: Art = (w, h, a, b, c, label) =>
  svg(w, h, `<rect width='100%' height='100%' fill='${a}'/>
  <g transform='translate(${w / 2} ${h * 0.42})'><circle r='${w * 0.16}' fill='${b}'/><path d='M ${-w * 0.07} ${w * 0.02} L 0 ${-w * 0.08} L ${w * 0.07} ${w * 0.02} Z' fill='${a}'/></g>
  <text x='50%' y='${h * 0.72}' text-anchor='middle' ${sans} font-weight='700' font-size='${w * 0.09}' fill='${b}' letter-spacing='-1'>${label}</text>
  <rect x='${w * 0.3}' y='${h * 0.82}' width='${w * 0.12}' height='${w * 0.04}' rx='3' fill='${b}'/><rect x='${w * 0.44}' y='${h * 0.82}' width='${w * 0.12}' height='${w * 0.04}' rx='3' fill='${c}'/><rect x='${w * 0.58}' y='${h * 0.82}' width='${w * 0.12}' height='${w * 0.04}' rx='3' fill='#ffffff' opacity='.7'/>`);

const blob: Art = (w, h, a, b, c, label) =>
  svg(w, h, `<defs><linearGradient id='s' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${b}'/><stop offset='1' stop-color='${c}'/></linearGradient><radialGradient id='hl' cx='35%' cy='30%' r='40%'><stop offset='0' stop-color='white' stop-opacity='.7'/><stop offset='1' stop-color='white' stop-opacity='0'/></radialGradient></defs>
  <rect width='100%' height='100%' fill='${a}'/>
  <ellipse cx='${w / 2}' cy='${h * 0.86}' rx='${w * 0.28}' ry='${h * 0.03}' fill='black' opacity='.18'/>
  <circle cx='${w / 2}' cy='${h * 0.48}' r='${Math.min(w, h) * 0.3}' fill='url(#s)'/><circle cx='${w / 2}' cy='${h * 0.48}' r='${Math.min(w, h) * 0.3}' fill='url(#hl)'/>
  <text x='${w * 0.06}' y='${h * 0.08 + 14}' font-family='ui-monospace, Menlo, monospace' font-size='${w * 0.03}' fill='${b}'>${label}</text>`);

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safe =
  (art: Art): Art =>
  (w, h, a, b, c, label) =>
    art(w, h, a, b, c, escape(label));

export const ART = {
  mesh: safe(mesh),
  swiss: safe(swiss),
  ui: safe(ui),
  specimen: safe(specimen),
  palette: safe(palette),
  motion: safe(motion),
  brand: safe(brand),
  blob: safe(blob),
};
export type ArtKind = keyof typeof ART;

export const avatar = (color: string, letter: string) =>
  svg(48, 48, `<rect width='48' height='48' fill='${color}'/><text x='24' y='31' text-anchor='middle' ${sans} font-weight='600' font-size='20' fill='white'>${letter}</text>`);
