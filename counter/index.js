import font from "./Jersey10-views.woff2";

const ID = "prakash-aryan";
const INK = "#17141f", PANEL = "#2a2640", CREAM = "#fbf1dc", MUTED = "#a79fc4", SKY = "#8fd3ec";
const ADVANCE = { 0: 525, 1: 300, 2: 600, 3: 600, 4: 525, 5: 525, 6: 600, 7: 525, 8: 600, 9: 600, ",": 225 };
const EYE = [".......", "..xxx..", ".xyyyx.", "xyykyyx", ".xyyyx.", "..xxx..", "......."];
const FONT = btoa(String.fromCharCode(...new Uint8Array(font)));

const notched = (x, y, w, h, fill, n = 2) =>
  `<path d="M${x + n},${y}H${x + w - n}V${y + n}H${x + w}V${y + h - n}H${x + w - n}V${y + h}H${x + n}V${y + h - n}H${x}V${y + n}H${x + n}Z" fill="${fill}"/>`;

const eye = (x, y) =>
  EYE.flatMap((row, r) =>
    [...row].map((ch, c) => {
      const fill = { x: SKY, y: CREAM, k: INK }[ch];
      return fill ? `<rect x="${x + c * 2}" y="${y + r * 2}" width="2" height="2" fill="${fill}"/>` : "";
    }),
  ).join("");

function badge(count) {
  const text = count.toLocaleString("en-US");
  const width = Math.ceil(132 + [...text].reduce((sum, ch) => sum + ADVANCE[ch], 0) / 70 + 16);
  const height = 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Profile views: ${text}" shape-rendering="crispEdges">
<title>Profile views: ${text}</title>
<style>
@font-face{font-family:"Jersey 10";src:url(data:font/woff2;base64,${FONT}) format("woff2")}
text{font-family:"Jersey 10",monospace;font-size:20px}
</style>
${notched(2, 2, width - 2, height - 2, INK)}
${notched(0, 0, width - 2, height - 2, INK)}
${notched(2, 2, width - 6, height - 6, CREAM)}
${notched(4, 4, width - 10, height - 10, PANEL)}
${eye(12, 10)}
<text x="34" y="23" fill="${MUTED}">Profile views</text>
<text x="132" y="23" fill="${CREAM}">${text}</text>
</svg>`;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== `/${ID}.svg`) return new Response("Not found", { status: 404 });
    const row =
      request.method === "GET"
        ? await env.DB.prepare("UPDATE views SET count = count + 1 WHERE id = ? RETURNING count").bind(ID).first()
        : await env.DB.prepare("SELECT count FROM views WHERE id = ?").bind(ID).first();
    return new Response(badge(row?.count ?? 0), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "max-age=0, no-cache, no-store, must-revalidate",
      },
    });
  },
};
