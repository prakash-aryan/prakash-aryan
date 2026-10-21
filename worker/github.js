const API = "https://api.github.com/graphql";

const PROFILE_Q = `query($login: String!) {
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
}`;

const REPOS_Q = `query($login: String!, $after: String) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        stargazerCount
        languages(first: 25, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } }
      }
    }
  }
}`;

const YEAR_Q = (y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") {
  totalCommitContributions restrictedContributionsCount
  contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
}`;

async function gql(token, query, variables) {
  const r = await fetch(API, {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "user-agent": "profile-cards", "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  const body = await r.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const calendarDays = (calendar) =>
  calendar.weeks.flatMap((w) => w.contributionDays.map((d) => [d.date, d.contributionCount]));

export async function fetchProfile(login, token) {
  const { user } = await gql(token, PROFILE_Q, { login });
  const repos = [];
  for (let after = null; ; ) {
    const page = (await gql(token, REPOS_Q, { login, after })).user.repositories;
    repos.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  const cc = user.contributionsCollection;
  const yearsQ = `query($login: String!) { user(login: $login) { ${cc.contributionYears.map(YEAR_Q).join(" ")} } }`;
  const years = (await gql(token, yearsQ, { login })).user;

  const languages = {};
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const lang = (languages[edge.node.name] ??= { size: 0, color: edge.node.color });
      lang.size += edge.size;
    }
  }

  const history = new Map();
  for (const [key, y] of Object.entries(years)) {
    for (const [d, c] of calendarDays(y.contributionCalendar)) if (d.startsWith(key.slice(1))) history.set(d, c);
  }
  const yearList = Object.values(years);
  const sum = (f) => yearList.reduce((s, y) => s + f(y), 0);

  return {
    login: user.login,
    name: user.name || user.login,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributed_to: user.repositoriesContributedTo.totalCount,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    commits: sum((y) => y.totalCommitContributions),
    total: sum((y) => y.contributionCalendar.totalContributions),
    year: calendarDays(cc.contributionCalendar),
    history: [...history].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    languages,
  };
}
