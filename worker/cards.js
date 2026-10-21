import font from "./Jersey10-cards.woff2";

const FONT = btoa(String.fromCharCode(...new Uint8Array(font)));
const HIDDEN_LANGUAGES = new Set(["HTML", "Jupyter Notebook", "BibTeX Style"]);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INK = "#17141f";
const PANEL = "#2a2640";
const PANEL_HI = "#3d3858";
const CREAM = "#fbf1dc";
const MUTED = "#a79fc4";
const FUR = "#f8b24b";
const RUST = "#d4814f";
const ROSE = "#e85d75";
const SAND = "#dcc3aa";
const SKY = "#8fd3ec";

const COLORS = { k: INK, o: FUR, r: RUST, w: CREAM, p: ROSE, s: SAND, b: SKY, h: "#ffffff" };

const CORGI_FACE = [
  ".kk............kk.",
  ".kok..........kok.",
  ".kopk........kpok.",
  ".koppk......kppok.",
  "kroppokkkkkkoppork",
  "kroooooowwoooooork",
  "krohkkoowwoohkkork",
  "krokkkoowwookkkork",
  "krokkkowwwwokkkork",
  "kroooowwkkwwoooork",
  "krowwwwwwwwwwwwork",
  ".kowwwwkkkkwwwwok.",
  ".kowwwwkppkwwwwok.",
  "..kwwwwwkkwwwwwk..",
  "...kkkkkkkkkkkk...",
];

const CORGI_BODY = [
  "...............kk.....",
  "..............kpok....",
  "..............kppok...",
  ".............kooooook.",
  ".............kohkooook",
  ".k..........kookoowwkk",
  "kok.kkkkkkkkkooowwwk..",
  ".koroooooooooooowwk...",
  "..kroooooooooooowk....",
  "..krroooooooowwwk.....",
  "..krrrooooowwwwk......",
  "...kwwkkkkkkkwwk......",
];
const CORGI_RUN = [
  [...CORGI_BODY, "...kok......kok.......", "...kk.......kk........"],
  [...CORGI_BODY, "..kok........kok......", "..kk..........kk......"],
];

const ICONS = {
  star: ["...x...", "..xxx..", "xxxxxxx", ".xxxxx.", "..xxx..", ".xx.xx.", ".x...x."],
  heart: [".xx.xx.", "xxxxxxx", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."],
  commit: [".......", "..xxx..", ".x...x.", "xx...xx", ".x...x.", "..xxx..", "......."],
  fork: ["x.....x", "x.....x", ".x...x.", "..x.x..", "...x...", "...x...", "...x..."],
  issue: ["..xxx..", ".x...x.", "x.....x", "x..x..x", "x.....x", ".x...x.", "..xxx.."],
  book: ["xxxxxx.", "x....x.", "x.xx.x.", "x....x.", "x.xx.x.", "x....x.", "xxxxxx."],
  flame: ["...x...", "..xx...", "..xxx.x", ".xxxxxx", "xxxyxxx", "xxyyyxx", ".xxyxx."],
  trophy: ["xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x...", "..xxx..", ".xxxxx."],
};

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const num = (n) => n.toLocaleString("en-US");
const range = (n) => [...Array(n).keys()];

function round(x) {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff !== 0.5) return Math.round(x);
  return f % 2 === 0 ? f : f + 1;
}

function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function streaks(history, today) {
  const counts = history.filter(([d]) => d <= today).map(([, c]) => c);
  let longest = 0, run = 0;
  for (const c of counts) {
    run = c ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let tail = counts.toReversed();
  if (tail.length && tail[0] === 0) tail = tail.slice(1);
  let current = 0;
  for (const c of tail) {
    if (!c) break;
    current += 1;
  }
  return [current, longest];
}

function pixels(rows, px, x = 0, y = 0, colors = COLORS) {
  const out = [];
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      const start = c;
      while (c < row.length && row[c] === ch) c += 1;
      if (ch !== ".") out.push(`<rect x="${x + start * px}" y="${y + r * px}" width="${(c - start) * px}" height="${px}" fill="${colors[ch]}"/>`);
    }
  });
  return out.join("");
}

const icon = (name, x, y, color, inner = CREAM) => pixels(ICONS[name], 2, x, y, { x: color, y: inner });

const notched = (x, y, w, h, fill, n = 4) =>
  `<path d="M${x + n},${y}H${x + w - n}V${y + n}H${x + w}V${y + h - n}H${x + w - n}V${y + h}` +
  `H${x + n}V${y + h - n}H${x}V${y + n}H${x + n}Z" fill="${fill}"/>`;

function segments(x, y, count, filled, color, seg = 15, gap = 2, height = 8) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const sx = x + i * (seg + gap);
    out.push(`<rect x="${sx}" y="${y}" width="${seg}" height="${height}" fill="${PANEL_HI}"/>`);
    const part = Math.min(Math.max(filled - i, 0), 1);
    if (part > 0) {
      const w = Math.max(3, round((part * seg) / 3) * 3);
      out.push(`<rect x="${sx}" y="${y}" width="${w}" height="${height}" fill="${color}"/>`);
    }
  }
  return out.join("");
}

const card = (w, h, title, body, extraCss = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title" shape-rendering="crispEdges">
<title id="title">${escape(title)}</title>
<style>
@font-face{font-family:"Jersey 10";src:url(data:font/woff2;base64,${FONT}) format("woff2")}
text{font-family:"Jersey 10",monospace;font-size:20px;fill:${CREAM}}
.big{font-size:30px}
.m{fill:${MUTED}}
${extraCss}
</style>
${notched(4, 4, w - 4, h - 4, INK)}
${notched(0, 0, w - 4, h - 4, INK)}
${notched(4, 4, w - 12, h - 12, CREAM)}
${notched(8, 8, w - 20, h - 20, PANEL)}
${body}
</svg>
`;

export function renderStats(d) {
  const rows = [
    ["star", FUR, "Stars", d.stars],
    ["heart", ROSE, "Contributions", d.total],
    ["commit", SKY, "Public commits", d.commits],
    ["fork", SKY, "Pull requests", d.prs],
    ["issue", ROSE, "Issues", d.issues],
    ["book", SAND, "Contributed to", d.contributed_to],
  ];
  const body = [
    pixels(CORGI_FACE, 4, 24, 26),
    `<text x="112" y="66" class="big">${escape(d.name)}</text>`,
    range(46).map((i) => `<rect x="${24 + i * 8}" y="112" width="4" height="2" fill="${PANEL_HI}"/>`).join(""),
  ];
  rows.forEach(([name, color, label, value], i) => {
    const col = Math.floor(i / 3), row = i % 3;
    const x = 24 + col * 192, y = 142 + row * 26;
    body.push(icon(name, x, y - 13, color));
    body.push(`<text x="${x + 22}" y="${y}" class="m">${label}</text>`);
    body.push(`<text x="${x + 176}" y="${y}" text-anchor="end">${num(value)}</text>`);
  });
  const title = `${d.name}: ${num(d.total)} contributions, ${num(d.stars)} stars, ${d.prs} pull requests, ${d.issues} issues`;
  return card(420, 220, title, body.join(""));
}

export function renderLanguages(d, count = 8) {
  const langs = Object.entries(d.languages)
    .filter(([n]) => !HIDDEN_LANGUAGES.has(n))
    .map(([n, v]) => [n, v.size])
    .sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const top = langs.slice(0, count).map(([n, s]) => [n, s / total]);
  const lead = top.length ? top[0][1] : 1;
  const body = [
    '<text x="24" y="48" class="big">Languages</text>',
    '<text x="392" y="48" class="m" text-anchor="end">by code size</text>',
  ];
  top.forEach(([name, share], i) => {
    const col = Math.floor(i / 4), row = i % 4;
    const x = 24 + col * 198, y = 82 + row * 32;
    body.push(`<text x="${x}" y="${y}">${escape(name)}</text>`);
    body.push(`<text x="${x + 168}" y="${y}" class="m" text-anchor="end">${(share * 100).toFixed(1)}%</text>`);
    body.push(segments(x, y + 5, 10, (share / lead) * 10, FUR));
  });
  const title = "Most used languages: " + top.map(([n, s]) => `${n} ${(s * 100).toFixed(1)}%`).join(", ");
  return card(420, 220, title, body.join(""));
}

export function renderActivity(d) {
  const days = d.year;
  const counts = days.map(([, c]) => c);
  const today = days.at(-1)[0];
  const [current, longest] = streaks(d.history, today);
  const bestI = counts.reduce((b, c, i) => (c >= counts[b] ? i : b), 0);
  const bestDate = parseDate(days[bestI][0]);
  const total = counts.reduce((s, c) => s + c, 0);

  const W = 860, H = 284;
  const ground = 236, pitch = 15, colw = 12, block = 8, maxBlocks = 13;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push([days[i][0], counts.slice(i, i + 7).reduce((s, c) => s + c, 0)]);
  const x0 = Math.floor((W - 4 - weeks.length * pitch + (pitch - colw)) / 2);
  const vmax = Math.max(...weeks.map(([, v]) => v)) || 1;
  const heights = weeks.map(([, v]) => (v ? Math.max(1, round(Math.sqrt(v / vmax) * maxBlocks)) : 0));
  const bestWeek = weeks.reduce((b, w, i) => (w[1] > weeks[b][1] ? i : b), 0);

  const cols = [];
  heights.forEach((n, i) => {
    const x = x0 + i * pitch;
    for (let b = 0; b < n; b++) {
      const color = b === n - 1 ? CREAM : i === bestWeek ? ROSE : b < 2 ? RUST : FUR;
      cols.push(`<rect x="${x}" y="${ground - (b + 1) * block + 2}" width="${colw}" height="${block - 2}" fill="${color}"/>`);
    }
  });

  const months = [], seen = new Set();
  weeks.forEach(([iso], i) => {
    const date = parseDate(iso);
    const key = `${date.year}-${date.month}`;
    if (i && !seen.has(key) && date.day <= 7) months.push(`<text x="${x0 + i * pitch}" y="262" class="m">${MONTHS[date.month - 1]}</text>`);
    seen.add(key);
  });

  const tops = heights.map((n) => (n ? ground - n * block + 2 : ground));
  const env = tops.map((_, i) => Math.min(...tops.slice(Math.max(0, i - 2), i + 3)));
  const cx = tops.map((_, i) => x0 + i * pitch + colw / 2);
  const idx = cx.flatMap((x, i) => (x >= 45 && x <= W - 49 ? [i] : []));
  const ex = cx[idx.at(-1)], ey = env[idx.at(-1)];
  const pts = cx.map((x, i) => [(x - ex).toFixed(1), env[i] - ey]);
  const ctrl = [null, ...range(env.length - 1).map((j) => {
    const i = j + 1;
    return env[i] === env[i - 1] ? null : [((cx[i] + cx[i - 1]) / 2 - ex).toFixed(1), Math.min(env[i], env[i - 1]) - 14 - ey];
  })];

  const trail = (order) => {
    const out = [`M${pts[order[0]][0]},${pts[order[0]][1]}`];
    for (let k = 1; k < order.length; k++) {
      const a = order[k - 1], b = order[k];
      const c = ctrl[Math.max(a, b)];
      out.push(c ? `Q${c[0]},${c[1]} ${pts[b][0]},${pts[b][1]}` : `L${pts[b][0]},${pts[b][1]}`);
    }
    return out.join(" ");
  };

  const runS = 9, restS = 2;
  const legs = `begin="left.begin;right.begin" repeatDur="${runS}s"`;
  const corgi =
    `<g transform="translate(${ex.toFixed(1)},${ey})">` +
    `<animateMotion id="left" path="${trail(idx.toReversed())}" dur="${runS}s" begin="1s;right.end+${restS}s" fill="freeze"/>` +
    `<animateMotion id="right" path="${trail(idx)}" dur="${runS}s" begin="left.end+${restS}s" fill="freeze"/>` +
    `<g><animateTransform attributeName="transform" type="scale" values="-1 1;-1 1" calcMode="discrete" begin="left.begin" dur="${runS + restS}s"/>` +
    `<g transform="translate(-33,-42)">` +
    `<g>${pixels(CORGI_RUN[0], 3)}<animate attributeName="visibility" values="visible;hidden" calcMode="discrete" dur="0.26s" ${legs}/></g>` +
    `<g visibility="hidden">${pixels(CORGI_RUN[1], 3)}<animate attributeName="visibility" values="hidden;visible" calcMode="discrete" dur="0.26s" ${legs}/></g>` +
    "</g></g></g>";

  const stats = [
    ["heart", ROSE, `${num(total)} in the last year`],
    ["flame", ROSE, `${num(current)}-day streak` + (current === longest ? "" : `, best ${num(longest)}`)],
    ["trophy", FUR, `best day ${counts[bestI]} on ${MONTHS[bestDate.month - 1]} ${bestDate.day}`],
  ];
  const statSvg = [];
  let sx = 28;
  for (const [name, color, text] of stats) {
    statSvg.push(icon(name, sx, 65, color, FUR));
    statSvg.push(`<text x="${sx + 22}" y="78">${escape(text)}</text>`);
    sx += 22 + round(text.length * 7.0) + 40;
  }

  const body = [
    '<text x="28" y="48" class="big">Contribution activity</text>',
    ...statSvg,
    `<rect x="20" y="${ground + 2}" width="${W - 44}" height="4" fill="${PANEL_HI}"/>`,
    ...cols,
    ...months,
    corgi,
  ];
  const title =
    `${num(total)} contributions in the last year; current streak ${current} days, ` +
    `longest streak ${longest} days, busiest day ${counts[bestI]} on ${days[bestI][0]}`;
  return card(W, H, title, body.join(""));
}
