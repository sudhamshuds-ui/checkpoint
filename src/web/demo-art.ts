/* Initial-letter avatars for the preview's made-up authors. */

const svg = (w: number, h: number, body: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

const sans = "font-family='Helvetica Neue, Helvetica, Arial, sans-serif'";

export const avatar = (color: string, letter: string) =>
  svg(48, 48, `<rect width='48' height='48' fill='${color}'/><text x='24' y='31' text-anchor='middle' ${sans} font-weight='600' font-size='20' fill='white'>${letter}</text>`);
