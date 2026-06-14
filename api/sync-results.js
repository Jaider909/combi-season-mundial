const SUPABASE_URL = process.env.SUPABASE_URL || "https://anetzkhbkfhmtwcslnzk.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const APISPORTS_KEY = process.env.APISPORTS_KEY || process.env.API_FOOTBALL_KEY || "";
const APISPORTS_LEAGUE_ID = process.env.APISPORTS_LEAGUE_ID || "";
const APISPORTS_SEASON = process.env.APISPORTS_SEASON || "2026";
const APISPORTS_TIMEZONE = process.env.APISPORTS_TIMEZONE || "America/Bogota";
const AUTO_FINISH_WITHOUT_SCORERS = process.env.AUTO_FINISH_WITHOUT_SCORERS === "true";

const EXACT_SCORE_POINTS = 8;
const WINNER_POINTS = 3;
const SCORER_POINTS = 2;

const TEAM_ALIASES = {
  Alemania: ["germany", "alemania"],
  "Arabia Saudita": ["saudi arabia", "arabia saudita"],
  Argelia: ["algeria", "argelia"],
  Argentina: ["argentina"],
  Australia: ["australia"],
  Austria: ["austria"],
  Bélgica: ["belgium", "belgica", "belgica"],
  "Bosnia y Herzegovina": ["bosnia and herzegovina", "bosnia y herzegovina"],
  Brasil: ["brazil", "brasil"],
  "Cabo Verde": ["cape verde", "cabo verde"],
  Canadá: ["canada", "canada"],
  Colombia: ["colombia"],
  "Congo DR": ["congo dr", "dr congo", "congo"],
  "Corea del Sur": ["south korea", "korea republic", "corea del sur"],
  "Costa de Marfil": ["ivory coast", "cote d ivoire", "costa de marfil"],
  Croacia: ["croatia", "croacia"],
  Curaçao: ["curacao", "curazao", "curacao"],
  Ecuador: ["ecuador"],
  Egipto: ["egypt", "egipto"],
  Escocia: ["scotland", "escocia"],
  España: ["spain", "espana", "españa"],
  "Estados Unidos": ["usa", "united states", "united states of america", "estados unidos"],
  Francia: ["france", "francia"],
  Ghana: ["ghana"],
  Haití: ["haiti", "haiti"],
  Inglaterra: ["england", "inglaterra"],
  Irak: ["iraq", "irak"],
  Irán: ["iran", "iran"],
  Japón: ["japan", "japon", "japón"],
  Jordania: ["jordan", "jordania"],
  Marruecos: ["morocco", "marruecos"],
  México: ["mexico", "méxico"],
  Noruega: ["norway", "noruega"],
  "Nueva Zelanda": ["new zealand", "nueva zelanda"],
  "Países Bajos": ["netherlands", "holanda", "paises bajos", "países bajos"],
  Panamá: ["panama", "panamá"],
  Paraguay: ["paraguay"],
  Portugal: ["portugal"],
  Qatar: ["qatar"],
  "República Checa": ["czech republic", "czechia", "republica checa", "república checa"],
  Senegal: ["senegal"],
  Sudáfrica: ["south africa", "sudafrica", "sudáfrica"],
  Suecia: ["sweden", "suecia"],
  Suiza: ["switzerland", "suiza"],
  Túnez: ["tunisia", "tunez", "túnez"],
  Turquía: ["turkey", "turkiye", "turquía", "turquia"],
  Uruguay: ["uruguay"],
  Uzbekistán: ["uzbekistan", "uzbekistán"],
};

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body, null, 2));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAliases(team) {
  return (TEAM_ALIASES[team] || [team]).map(normalize);
}

function teamMatches(localTeam, providerTeam) {
  const providerName = normalize(providerTeam);

  return getAliases(localTeam).some((alias) => alias === providerName || providerName.includes(alias));
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function apiHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...apiHeaders(),
      prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${response.status}: ${message}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function patchMatch(matchId, payload) {
  try {
    return await supabaseRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!/result_source|result_review_status|result_synced_at/.test(error.message || "")) {
      throw error;
    }

    const { result_source, result_review_status, result_synced_at, ...fallbackPayload } = payload;

    return supabaseRequest(`matches?id=eq.${encodeURIComponent(matchId)}`, {
      method: "PATCH",
      body: JSON.stringify(fallbackPayload),
    });
  }
}

function fromMatchRow(row) {
  return {
    id: row.id,
    matchNumber: row.match_number,
    date: row.match_date,
    phase: row.phase,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homeScorers: row.home_scorers || [],
    awayScorers: row.away_scorers || [],
    status: row.status,
    resultSource: row.result_source,
    resultReviewStatus: row.result_review_status,
    resultSyncedAt: row.result_synced_at,
  };
}

function fromPredictionRow(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    matchId: row.match_id,
    homeScore: row.predicted_home_score,
    awayScore: row.predicted_away_score,
    homeScorer: row.predicted_home_scorer,
    awayScorer: row.predicted_away_scorer,
    estimatedPoints: row.points_awarded,
  };
}

function parsePredictedScorers(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOwnGoal(value) {
  return normalize(value).startsWith("autogol");
}

function countMatchingScorers(players = [], predictedScorers) {
  const realPlayers = new Set(
    players
      .filter((player) => !isOwnGoal(player))
      .map(normalize)
      .filter(Boolean)
  );
  const uniquePredictions = new Set(
    parsePredictedScorers(predictedScorers)
      .filter((player) => !isOwnGoal(player))
      .map(normalize)
  );

  return [...uniquePredictions].filter((playerName) => realPlayers.has(playerName)).length;
}

function calculatePredictionPoints(prediction, match) {
  if (
    match.status !== "finished" ||
    !Number.isFinite(match.homeScore) ||
    !Number.isFinite(match.awayScore)
  ) {
    return 0;
  }

  const exactScore =
    prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore;
  const scorerPoints =
    countMatchingScorers(match.homeScorers, prediction.homeScorer) * SCORER_POINTS +
    countMatchingScorers(match.awayScorers, prediction.awayScorer) * SCORER_POINTS;
  const predictedDiff = Math.sign(prediction.homeScore - prediction.awayScore);
  const realDiff = Math.sign(match.homeScore - match.awayScore);
  const winnerPoints = predictedDiff === realDiff ? WINNER_POINTS : 0;

  return (exactScore ? EXACT_SCORE_POINTS : 0) + winnerPoints + scorerPoints;
}

async function listDueMatches() {
  const now = new Date();
  const past = addDays(now, -2);
  const query = new URLSearchParams();

  query.set("select", "*");
  query.append("status", "in.(open,locked)");
  query.append("match_date", `lte.${now.toISOString()}`);
  query.append("match_date", `gte.${past.toISOString()}`);
  query.set("order", "match_date.asc");

  const rows = await supabaseRequest(`matches?${query.toString()}`);
  return rows.map(fromMatchRow);
}

async function lockDueMatches(matches) {
  const openMatches = matches.filter((match) => match.status === "open");
  const lockedIds = [];

  for (const match of openMatches) {
    await patchMatch(match.id, { status: "locked" });
    match.status = "locked";
    lockedIds.push(match.matchNumber || match.id);
  }

  return lockedIds;
}

function getApiSportsHeaders() {
  return {
    "x-apisports-key": APISPORTS_KEY,
  };
}

async function fetchFixturesForWindow(matches) {
  if (!APISPORTS_KEY || !matches.length) {
    return [];
  }

  const dates = matches.map((match) => new Date(match.date).getTime()).filter(Number.isFinite);
  const from = dateOnly(addDays(new Date(Math.min(...dates)), -1));
  const to = dateOnly(addDays(new Date(Math.max(...dates)), 1));
  const params = new URLSearchParams({
    from,
    to,
    season: APISPORTS_SEASON,
    timezone: APISPORTS_TIMEZONE,
  });

  if (APISPORTS_LEAGUE_ID) {
    params.set("league", APISPORTS_LEAGUE_ID);
  }

  const response = await fetch(`https://v3.football.api-sports.io/fixtures?${params.toString()}`, {
    headers: getApiSportsHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`API-Football ${response.status}: ${message}`);
  }

  const payload = await response.json();
  return payload.response || [];
}

async function fetchFixtureEvents(fixtureId) {
  const response = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, {
    headers: getApiSportsHeaders(),
  });

  if (!response.ok) {
    return { ok: false, homeScorers: [], awayScorers: [] };
  }

  const payload = await response.json();
  return { ok: true, events: payload.response || [] };
}

function isFinishedFixture(fixture) {
  return ["FT", "AET", "PEN"].includes(fixture?.fixture?.status?.short);
}

function findFixtureForMatch(match, fixtures) {
  return fixtures.find((fixture) => {
    const home = fixture?.teams?.home?.name;
    const away = fixture?.teams?.away?.name;

    return teamMatches(match.homeTeam, home) && teamMatches(match.awayTeam, away);
  });
}

function parseGoalEvents(events, fixture) {
  const homeId = fixture?.teams?.home?.id;
  const awayId = fixture?.teams?.away?.id;
  const homeScorers = [];
  const awayScorers = [];

  for (const event of events) {
    if (event?.type !== "Goal") {
      continue;
    }

    const detail = normalize(event?.detail);

    if (detail.includes("missed penalty")) {
      continue;
    }

    const isOwn = detail.includes("own goal");
    const scorerName = isOwn ? "Autogol" : event?.player?.name;
    const teamId = event?.team?.id;

    if (!scorerName) {
      continue;
    }

    if (teamId === homeId) {
      homeScorers.push(scorerName);
    } else if (teamId === awayId) {
      awayScorers.push(scorerName);
    }
  }

  return { homeScorers, awayScorers };
}

async function updateMatchWithFixture(match, fixture) {
  const homeScore = fixture?.goals?.home;
  const awayScore = fixture?.goals?.away;

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return { updated: false, reason: "sin_marcador" };
  }

  const eventResult = await fetchFixtureEvents(fixture.fixture.id);
  const { homeScorers, awayScorers } = eventResult.ok
    ? parseGoalEvents(eventResult.events, fixture)
    : { homeScorers: [], awayScorers: [] };
  const totalGoals = homeScore + awayScore;

  if (totalGoals > 0 && !eventResult.ok && !AUTO_FINISH_WITHOUT_SCORERS) {
    return { updated: false, reason: "sin_eventos_de_gol" };
  }

  const updatedRows = await patchMatch(match.id, {
      home_score: homeScore,
      away_score: awayScore,
      home_scorers: homeScorers,
      away_scorers: awayScorers,
      status: "finished",
      result_source: "automatic",
      result_review_status: "needs_review",
      result_synced_at: new Date().toISOString(),
  });
  const updatedMatch = fromMatchRow(updatedRows[0]);
  const predictionRows = await supabaseRequest(
    `predictions?select=*&match_id=eq.${encodeURIComponent(match.id)}`
  );
  const predictions = predictionRows.map(fromPredictionRow);

  for (const prediction of predictions) {
    const points = calculatePredictionPoints(prediction, updatedMatch);
    await supabaseRequest(`predictions?id=eq.${encodeURIComponent(prediction.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ points_awarded: points }),
    });
  }

  return {
    updated: true,
    result: `${homeScore}-${awayScore}`,
    predictions: predictions.length,
    scorers: [...homeScorers, ...awayScorers],
  };
}

async function syncFinishedResults(matches) {
  if (!APISPORTS_KEY) {
    return { enabled: false, updated: [], skipped: [] };
  }

  const fixtures = await fetchFixturesForWindow(matches);
  const updated = [];
  const skipped = [];

  for (const match of matches) {
    const fixture = findFixtureForMatch(match, fixtures);

    if (!fixture) {
      skipped.push({ match: match.matchNumber, reason: "no_encontrado_en_api" });
      continue;
    }

    if (!isFinishedFixture(fixture)) {
      skipped.push({
        match: match.matchNumber,
        reason: `estado_${fixture?.fixture?.status?.short || "desconocido"}`,
      });
      continue;
    }

    const result = await updateMatchWithFixture(match, fixture);

    if (result.updated) {
      updated.push({ match: match.matchNumber, ...result });
    } else {
      skipped.push({ match: match.matchNumber, reason: result.reason });
    }
  }

  return { enabled: true, updated, skipped };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Metodo no permitido" });
    }

    const providedSecret = req.query?.secret || req.headers["x-cron-secret"];

    if (CRON_SECRET && providedSecret !== CRON_SECRET) {
      return json(res, 401, { ok: false, error: "No autorizado" });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, {
        ok: false,
        error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      });
    }

    const dueMatches = await listDueMatches();
    const locked = await lockDueMatches(dueMatches);
    const resultSync = await syncFinishedResults(dueMatches);

    return json(res, 200, {
      ok: true,
      checkedAt: new Date().toISOString(),
      dueMatches: dueMatches.map((match) => match.matchNumber || match.id),
      locked,
      resultSync,
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.message || "Error sincronizando resultados.",
    });
  }
};
