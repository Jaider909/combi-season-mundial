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
    status: row.status,
    venue: row.venue,
    city: row.city,
    source: row.source,
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

  const { data, error } = await client
    .from("matches")
    .update({
      home_score: result.homeScore ?? null,
      away_score: result.awayScore ?? null,
      home_scorers: result.homeScorers || [],
      away_scorers: result.awayScorers || [],
      status: result.status || "finished",
    })
    .eq("id", matchId)
    .select()
    .maybeSingle();

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

export function getMatchesForTeam(matches, team) {
  if (!team || team === "Sin equipo definido") {
    return [];
  }

  return matches.filter((match) => match.homeTeam === team || match.awayTeam === team);
}
