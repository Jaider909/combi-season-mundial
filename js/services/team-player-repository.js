import { teamPlayers as fallbackTeamPlayers } from "../config/team-players.js?v=switzerland-fallback";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

let cachedPlayersByTeam = null;

function fromTeamPlayerRow(row) {
  return {
    id: row.id,
    team: row.team,
    name: row.name,
    position: row.position,
    shirtNumber: row.shirt_number,
    club: row.club,
    isFeatured: row.is_featured,
    active: row.active,
  };
}

function fallbackMap() {
  return Object.fromEntries(
    Object.entries(fallbackTeamPlayers).map(([team, players]) => [team, [...players]])
  );
}

function groupPlayers(rows) {
  return rows.reduce((summary, row) => {
    if (!summary[row.team]) {
      summary[row.team] = [];
    }

    summary[row.team].push(row.name);
    return summary;
  }, {});
}

async function fetchTeamPlayersPage(client, from, to) {
  const { data, error } = await client
    .from("team_players")
    .select("team, name, position, is_featured")
    .eq("active", true)
    .order("team", { ascending: true })
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchAllActiveTeamPlayers(client) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const page = await fetchTeamPlayersPage(client, from, from + pageSize - 1);
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }
  }
}

export async function listPlayersByTeam() {
  if (cachedPlayersByTeam) {
    return cachedPlayersByTeam;
  }

  if (!isSupabaseConfigured()) {
    cachedPlayersByTeam = fallbackMap();
    return cachedPlayersByTeam;
  }

  try {
    const client = await getSupabaseClient();
    const data = await fetchAllActiveTeamPlayers(client);
    cachedPlayersByTeam = data.length ? groupPlayers(data) : fallbackMap();
    return cachedPlayersByTeam;
  } catch (error) {
    console.warn("No se pudieron cargar jugadores desde Supabase.", error);
    cachedPlayersByTeam = fallbackMap();
    return cachedPlayersByTeam;
  }
}

export function getPlayersForTeam(playersByTeam, team) {
  return playersByTeam?.[team] || fallbackTeamPlayers[team] || [];
}

export async function listTeamPlayersForAdmin(team = null) {
  if (!isSupabaseConfigured()) {
    return Object.entries(fallbackTeamPlayers).flatMap(([team, players]) =>
      players.map((name) => ({
        id: `${team}-${name}`,
        team,
        name,
        position: "",
        shirtNumber: null,
        club: "",
        isFeatured: true,
        active: true,
      }))
    );
  }

  const client = await getSupabaseClient();
  let query = client
    .from("team_players")
    .select("id, team, name, position, shirt_number, club, is_featured, active")
    .order("shirt_number", { ascending: true })
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (team) {
    query = query.eq("team", team);
  } else {
    query = query.range(0, 2000);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(fromTeamPlayerRow);
}

export async function saveTeamPlayer(player) {
  if (!isSupabaseConfigured()) {
    throw new Error("La gestión de jugadores requiere Supabase activo.");
  }

  const client = await getSupabaseClient();
  const payload = {
    team: player.team,
    name: player.name,
    position: player.position || null,
    shirt_number: player.shirtNumber || null,
    club: player.club || null,
    is_featured: Boolean(player.isFeatured),
    active: Boolean(player.active),
    source: "COMBI admin",
  };
  const { data, error } = await client
    .from("team_players")
    .upsert(payload, { onConflict: "team,name" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  cachedPlayersByTeam = null;
  return fromTeamPlayerRow(data);
}

export async function updateTeamPlayer(playerId, patch) {
  if (!isSupabaseConfigured()) {
    throw new Error("La gestión de jugadores requiere Supabase activo.");
  }

  const client = await getSupabaseClient();
  const payload = {};

  if ("active" in patch) {
    payload.active = Boolean(patch.active);
  }

  if ("isFeatured" in patch) {
    payload.is_featured = Boolean(patch.isFeatured);
  }

  const { data, error } = await client
    .from("team_players")
    .update(payload)
    .eq("id", playerId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  cachedPlayersByTeam = null;
  return fromTeamPlayerRow(data);
}
