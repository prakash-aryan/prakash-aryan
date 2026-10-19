#!/usr/bin/env python3
import argparse
import base64
import datetime as dt
import json
import math
import os
import subprocess
import urllib.request
from html import escape
from pathlib import Path

API = "https://api.github.com/graphql"
HIDDEN_LANGUAGES = {"HTML", "Jupyter Notebook", "BibTeX Style"}
FONT = Path(__file__).resolve().parent / "fonts" / "Jersey10.woff2"

INK = "#17141f"
PANEL = "#2a2640"
PANEL_HI = "#3d3858"
CREAM = "#fbf1dc"
MUTED = "#a79fc4"
FUR = "#f8b24b"
RUST = "#d4814f"
ROSE = "#e85d75"
SAND = "#dcc3aa"
SKY = "#8fd3ec"

COLORS = {"k": INK, "o": FUR, "r": RUST, "w": CREAM, "p": ROSE, "s": SAND, "b": SKY, "h": "#ffffff"}


CORGI_FACE = [
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
]

CORGI_BODY = [
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
]
CORGI_RUN = [
    CORGI_BODY + ["...kok......kok.......", "...kk.......kk........"],
    CORGI_BODY + ["..kok........kok......", "..kk..........kk......"],
]

ICONS = {
    "star": ["...x...", "..xxx..", "xxxxxxx", ".xxxxx.", "..xxx..", ".xx.xx.", ".x...x."],
    "heart": [".xx.xx.", "xxxxxxx", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."],
    "commit": [".......", "..xxx..", ".x...x.", "xx...xx", ".x...x.", "..xxx..", "......."],
    "fork": ["x.....x", "x.....x", ".x...x.", "..x.x..", "...x...", "...x...", "...x..."],
    "issue": ["..xxx..", ".x...x.", "x.....x", "x..x..x", "x.....x", ".x...x.", "..xxx.."],
    "book": ["xxxxxx.", "x....x.", "x.xx.x.", "x....x.", "x.xx.x.", "x....x.", "xxxxxx."],
    "flame": ["...x...", "..xx...", "..xxx.x", ".xxxxxx", "xxxyxxx", "xxyyyxx", ".xxyxx."],
    "trophy": ["xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x...", "..xxx..", ".xxxxx."],
}

PROFILE_Q = """query($login: String!) {
  user(login: $login) {
    name login
    pullRequests { totalCount }
    issues { totalCount }
    repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
    contributionsCollection {
      contributionYears
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}"""

REPOS_Q = """query($login: String!, $after: String) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        stargazerCount
        languages(first: 25, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } }
      }
    }
  }
}"""

YEAR_Q = """y{y}: contributionsCollection(from: "{y}-01-01T00:00:00Z", to: "{y}-12-31T23:59:59Z") {{
  totalCommitContributions restrictedContributionsCount
  contributionCalendar {{ totalContributions weeks {{ contributionDays {{ date contributionCount }} }} }}
}}"""


def token():
    for key in ("GH_TOKEN", "GITHUB_TOKEN"):
        if os.environ.get(key):
            return os.environ[key]
    return subprocess.check_output(["gh", "auth", "token"], text=True).strip()


def gql(tok, query, **variables):
    req = urllib.request.Request(
        API,
        json.dumps({"query": query, "variables": variables}).encode(),
        {"Authorization": f"bearer {tok}", "User-Agent": "profile-cards"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        body = json.load(r)
    if body.get("errors"):
        raise SystemExit(json.dumps(body["errors"], indent=2))
    return body["data"]


def calendar_days(calendar):
    return [(d["date"], d["contributionCount"]) for w in calendar["weeks"] for d in w["contributionDays"]]


def fetch(login, tok):
    user = gql(tok, PROFILE_Q, login=login)["user"]
    repos, after = [], None
    while True:
        page = gql(tok, REPOS_Q, login=login, after=after)["user"]["repositories"]
        repos += page["nodes"]
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]
    cc = user["contributionsCollection"]
    years_q = "query($login: String!) { user(login: $login) { %s } }" % " ".join(
        YEAR_Q.format(y=y) for y in cc["contributionYears"]
    )
    years = gql(tok, years_q, login=login)["user"]

    languages = {}
    for repo in repos:
        for edge in repo["languages"]["edges"]:
            lang = languages.setdefault(edge["node"]["name"], {"size": 0, "color": edge["node"]["color"]})
            lang["size"] += edge["size"]

    history = {}
    for key, y in years.items():
        history.update((d, c) for d, c in calendar_days(y["contributionCalendar"]) if d.startswith(key[1:]))
    years = list(years.values())

    return {
        "login": user["login"],
        "name": user["name"] or user["login"],
        "prs": user["pullRequests"]["totalCount"],
        "issues": user["issues"]["totalCount"],
        "contributed_to": user["repositoriesContributedTo"]["totalCount"],
        "stars": sum(r["stargazerCount"] for r in repos),
        "commits": sum(y["totalCommitContributions"] for y in years),
        "total": sum(y["contributionCalendar"]["totalContributions"] for y in years),
        "year": calendar_days(cc["contributionCalendar"]),
        "history": sorted(history.items()),
        "languages": languages,
    }


def streaks(history, today):
    counts = [c for d, c in history if d <= today]
    longest = run = 0
    for c in counts:
        run = run + 1 if c else 0
        longest = max(longest, run)
    tail = counts[::-1]
    if tail and tail[0] == 0:
        tail = tail[1:]
    current = 0
    for c in tail:
        if not c:
            break
        current += 1
    return current, longest


def pixels(rows, px, x=0, y=0, colors=None):
    colors = colors or COLORS
    out = []
    for r, row in enumerate(rows):
        c = 0
        while c < len(row):
            ch = row[c]
            start = c
            while c < len(row) and row[c] == ch:
                c += 1
            if ch != ".":
                out.append(f'<rect x="{x + start * px}" y="{y + r * px}" width="{(c - start) * px}" height="{px}" fill="{colors[ch]}"/>')
    return "".join(out)


def icon(name, x, y, color, inner=CREAM):
    return pixels(ICONS[name], 2, x, y, {"x": color, "y": inner})


def notched(x, y, w, h, fill, n=4):
    return (
        f'<path d="M{x + n},{y}H{x + w - n}V{y + n}H{x + w}V{y + h - n}H{x + w - n}V{y + h}'
        f'H{x + n}V{y + h - n}H{x}V{y + n}H{x + n}Z" fill="{fill}"/>'
    )


def segments(x, y, count, filled, color, seg=15, gap=2, height=8):
    out = []
    for i in range(count):
        sx = x + i * (seg + gap)
        out.append(f'<rect x="{sx}" y="{y}" width="{seg}" height="{height}" fill="{PANEL_HI}"/>')
        part = min(max(filled - i, 0), 1)
        if part > 0:
            w = max(3, round(part * seg / 3) * 3)
            out.append(f'<rect x="{sx}" y="{y}" width="{w}" height="{height}" fill="{color}"/>')
    return "".join(out)


def card(w, h, title, body, extra_css=""):
    font = base64.b64encode(FONT.read_bytes()).decode()
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title" shape-rendering="crispEdges">
<title id="title">{escape(title)}</title>
<style>
@font-face{{font-family:"Jersey 10";src:url(data:font/woff2;base64,{font}) format("woff2")}}
text{{font-family:"Jersey 10",monospace;font-size:20px;fill:{CREAM}}}
.big{{font-size:30px}}
.m{{fill:{MUTED}}}
{extra_css}
</style>
{notched(4, 4, w - 4, h - 4, INK)}
{notched(0, 0, w - 4, h - 4, INK)}
{notched(4, 4, w - 12, h - 12, CREAM)}
{notched(8, 8, w - 20, h - 20, PANEL)}
{body}
</svg>
"""


def render_stats(d):
    rows = [
        ("star", FUR, "Stars", d["stars"]),
        ("heart", ROSE, "Contributions", d["total"]),
        ("commit", SKY, "Public commits", d["commits"]),
        ("fork", SKY, "Pull requests", d["prs"]),
        ("issue", ROSE, "Issues", d["issues"]),
        ("book", SAND, "Contributed to", d["contributed_to"]),
    ]
    body = [
        pixels(CORGI_FACE, 4, 24, 26),
        f'<text x="112" y="66" class="big">{escape(d["name"])}</text>',
        "".join(f'<rect x="{x}" y="112" width="4" height="2" fill="{PANEL_HI}"/>' for x in range(24, 392, 8)),
    ]
    for i, (name, color, label, value) in enumerate(rows):
        col, row = divmod(i, 3)
        x, y = 24 + col * 192, 142 + row * 26
        body.append(icon(name, x, y - 13, color))
        body.append(f'<text x="{x + 22}" y="{y}" class="m">{label}</text>')
        body.append(f'<text x="{x + 176}" y="{y}" text-anchor="end">{value:,}</text>')
    title = f"{d['name']}: {d['total']:,} contributions, {d['stars']:,} stars, {d['prs']} pull requests, {d['issues']} issues"
    return card(420, 220, title, "".join(body))


def render_languages(d, count=8):
    langs = [(n, v["size"]) for n, v in d["languages"].items() if n not in HIDDEN_LANGUAGES]
    langs.sort(key=lambda kv: -kv[1])
    total = sum(s for _, s in langs) or 1
    top = [(n, s / total) for n, s in langs[:count]]
    lead = top[0][1] if top else 1
    body = [
        '<text x="24" y="48" class="big">Languages</text>',
        '<text x="392" y="48" class="m" text-anchor="end">by code size</text>',
    ]
    for i, (name, share) in enumerate(top):
        col, row = divmod(i, 4)
        x, y = 24 + col * 198, 82 + row * 32
        body.append(f'<text x="{x}" y="{y}">{escape(name)}</text>')
        body.append(f'<text x="{x + 168}" y="{y}" class="m" text-anchor="end">{share * 100:.1f}%</text>')
        body.append(segments(x, y + 5, 10, share / lead * 10, FUR))
    title = "Most used languages: " + ", ".join(f"{n} {s * 100:.1f}%" for n, s in top)
    return card(420, 220, title, "".join(body))


def render_activity(d):
    days = d["year"]
    counts = [c for _, c in days]
    today = days[-1][0]
    current, longest = streaks(d["history"], today)
    best_i = max(range(len(counts)), key=lambda i: (counts[i], i))
    best_date = dt.date.fromisoformat(days[best_i][0])
    total = sum(counts)

    W, H = 860, 284
    ground, pitch, colw, block, max_blocks = 236, 15, 12, 8, 13
    weeks = [(days[i][0], sum(counts[i:i + 7])) for i in range(0, len(days), 7)]
    x0 = (W - 4 - len(weeks) * pitch + (pitch - colw)) // 2
    vmax = max(v for _, v in weeks) or 1
    heights = [max(1, round(math.sqrt(v / vmax) * max_blocks)) if v else 0 for _, v in weeks]
    best_week = max(range(len(weeks)), key=lambda i: weeks[i][1])

    cols = []
    for i, n in enumerate(heights):
        x = x0 + i * pitch
        for b in range(n):
            color = CREAM if b == n - 1 else (ROSE if i == best_week else (RUST if b < 2 else FUR))
            cols.append(f'<rect x="{x}" y="{ground - (b + 1) * block + 2}" width="{colw}" height="{block - 2}" fill="{color}"/>')

    months, seen = [], set()
    for i, (iso, _) in enumerate(weeks):
        date = dt.date.fromisoformat(iso)
        key = (date.year, date.month)
        if i and key not in seen and date.day <= 7:
            months.append(f'<text x="{x0 + i * pitch}" y="262" class="m">{date:%b}</text>')
        seen.add(key)

    tops = [ground - n * block + 2 if n else ground for n in heights]
    env = [min(tops[max(0, i - 2): i + 3]) for i in range(len(tops))]
    cx = [x0 + i * pitch + colw / 2 for i in range(len(tops))]
    idx = [i for i, x in enumerate(cx) if 45 <= x <= W - 49]
    ex, ey = cx[idx[-1]], env[idx[-1]]
    pts =[(f"{x - ex:.1f}", y - ey) for x, y in zip(cx, env)]
    ctrl = [None] + [
        None if env[i] == env[i - 1] else (f"{(cx[i] + cx[i - 1]) / 2 - ex:.1f}", min(env[i], env[i - 1]) - 14 - ey)
        for i in range(1, len(env))
    ]

    def trail(order):
        out = [f"M{pts[order[0]][0]},{pts[order[0]][1]}"]
        for a, b in zip(order, order[1:]):
            c = ctrl[max(a, b)]
            out.append(f"Q{c[0]},{c[1]} {pts[b][0]},{pts[b][1]}" if c else f"L{pts[b][0]},{pts[b][1]}")
        return " ".join(out)

    run_s, rest_s = 9, 2
    legs = f'begin="left.begin;right.begin" repeatDur="{run_s}s"'
    corgi = (
        f'<g transform="translate({ex:.1f},{ey})">'
        f'<animateMotion id="left" path="{trail(idx[::-1])}" dur="{run_s}s" begin="1s;right.end+{rest_s}s" fill="freeze"/>'
        f'<animateMotion id="right" path="{trail(idx)}" dur="{run_s}s" begin="left.end+{rest_s}s" fill="freeze"/>'
        f'<g><animateTransform attributeName="transform" type="scale" values="-1 1;-1 1" calcMode="discrete" begin="left.begin" dur="{run_s + rest_s}s"/>'
        f'<g transform="translate(-33,-42)">'
        f'<g>{pixels(CORGI_RUN[0], 3)}<animate attributeName="visibility" values="visible;hidden" calcMode="discrete" dur="0.26s" {legs}/></g>'
        f'<g visibility="hidden">{pixels(CORGI_RUN[1], 3)}<animate attributeName="visibility" values="hidden;visible" calcMode="discrete" dur="0.26s" {legs}/></g>'
        "</g></g></g>"
    )

    stats = [
        ("heart", ROSE, f"{total:,} in the last year"),
        ("flame", ROSE, f"{current:,}-day streak" + ("" if current == longest else f", best {longest:,}")),
        ("trophy", FUR, f"best day {counts[best_i]} on {best_date:%b} {best_date.day}"),
    ]
    stat_svg, sx = [], 28
    for name, color, text in stats:
        stat_svg.append(icon(name, sx, 65, color, FUR))
        stat_svg.append(f'<text x="{sx + 22}" y="78">{escape(text)}</text>')
        sx += 22 + round(len(text) * 7.0) + 40

    body = [
        '<text x="28" y="48" class="big">Contribution activity</text>',
        *stat_svg,
        f'<rect x="20" y="{ground + 2}" width="{W - 44}" height="4" fill="{PANEL_HI}"/>',
        *cols,
        *months,
        corgi,
    ]
    title = (
        f"{total:,} contributions in the last year; current streak {current} days, "
        f"longest streak {longest} days, busiest day {counts[best_i]} on {days[best_i][0]}"
    )
    return card(W, H, title, "".join(body))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--user", default="prakash-aryan")
    p.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "cards"))
    p.add_argument("--cache", help="write fetched data here, or read it with --offline")
    p.add_argument("--offline", action="store_true")
    args = p.parse_args()

    if args.offline:
        data = json.loads(Path(args.cache).read_text())
    else:
        data = fetch(args.user, token())
        if args.cache:
            Path(args.cache).write_text(json.dumps(data))

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "stats.svg").write_text(render_stats(data))
    (out / "languages.svg").write_text(render_languages(data))
    (out / "activity.svg").write_text(render_activity(data))
    print(f"wrote cards to {out}")


if __name__ == "__main__":
    main()
