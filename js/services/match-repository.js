import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

function fromMatchRow(row) {
  return {
    id: row.id,
    matchNumber: row.match_number,
    date: row.match_date,
    phase: row.phase,
    groupCode: row.group_code,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homeScorers: row.home_scorers || [],
    awayScorers: row.away_scorers || [],
    advancingTeam: row.advancing_team,
    decisionMethod: row.decision_method,
    status: row.status,
    venue: row.venue,
    city: row.city,
    source: row.source,
    resultSource: row.result_source,
    resultReviewStatus: row.result_review_status,
    resultSyncedAt: row.result_synced_at,
  };
}

export async function listMatches() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(fromMatchRow);
}

export async function updateMatchResult(matchId, result) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = await getSupabaseClient();
  await assertAdminSession(client);
  const payload = {
    home_score: result.homeScore ?? null,
    away_score: result.awayScore ?? null,
    home_scorers: result.homeScorers || [],
    away_scorers: result.awayScorers || [],
    status: result.status || "finished",
  };

  if ("advancingTeam" in result) {
    payload.advancing_team = result.advancingTeam || null;
  }

  if ("decisionMethod" in result) {
    payload.decision_method = result.decisionMethod || null;
  }

  if (result.resultSource) {
    payload.result_source = result.resultSource;
  }

  if (result.resultReviewStatus) {
    payload.result_review_status = result.resultReviewStatus;
  }

  if (result.resultSyncedAt) {
    payload.result_synced_at = result.resultSyncedAt;
  }

  let { data, error } = await client
    .from("matches")
    .update(payload)
    .eq("id", matchId)
    .select()
    .maybeSingle();

  if (
    error &&
    /result_source|result_review_status|result_synced_at|advancing_team|decision_method/.test(
      error.message || ""
    )
  ) {
    delete payload.result_source;
    delete payload.result_review_status;
    delete payload.result_synced_at;
    delete payload.advancing_team;
    delete payload.decision_method;

    const fallbackResult = await client
      .from("matches")
      .update(payload)
      .eq("id", matchId)
      .select()
      .maybeSingle();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase no permitió actualizar este partido. Revisa la policy de update en matches.");
  }

  return fromMatchRow(data);
}

async function assertAdminSession(client) {
  const { data: sessionData } = await client.auth.getUser();

  if (!sessionData?.user?.email) {
    throw new Error("Tu sesión de Supabase no está activa. Cierra sesión y vuelve a entrar como admin.");
  }

  const { data: isAdmin, error: adminError } = await client.rpc("is_combi_admin");

  if (adminError) {
    throw adminError;
  }

  if (!isAdmin) {
    throw new Error(
      `Tu sesión actual (${sessionData.user.email}) no está reconocida como admin en Supabase.`
    );
  }
}

export async function updateMatchTeams(matchId, patch) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = await getSupabaseClient();
  await assertAdminSession(client);
  const { data, error } = await client
    .from("matches")
    .update({
      home_team: patch.homeTeam,
      away_team: patch.awayTeam,
      status: patch.status,
    })
    .eq("id", matchId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase no permitió actualizar este cruce. Revisa la policy de update en matches.");
  }

  return fromMatchRow(data);
}

export async function updateMatchSchedule(matchId, patch) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = await getSupabaseClient();
  await assertAdminSession(client);
  const payload = {
    match_date: patch.date,
  };

  if (patch.status) {
    payload.status = patch.status;
  }

  const { data, error } = await client
    .from("matches")
    .update(payload)
    .eq("id", matchId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase no permitió actualizar el horario. Revisa la policy de update en matches.");
  }

  return fromMatchRow(data);
}

export function getMatchesForTeam(matches, team) {
  if (!team || team === "Sin equipo definido") {
    return [];
  }

  return matches.filter((match) => match.homeTeam === team || match.awayTeam === team);
}
