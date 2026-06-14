import { readJson, writeJson } from "./storage.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

const challengesKey = "combiSeasonChallenges";

function fromChallengeRow(row) {
  return {
    id: row.id,
    matchId: row.match_id,
    creatorPlayerId: row.creator_player_id,
    opponentPlayerId: row.opponent_player_id,
    creatorTeam: row.creator_team,
    opponentTeam: row.opponent_team,
    stakeAmount: row.stake_amount,
    status: row.status,
    winnerPlayerId: row.winner_player_id,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    closedAt: row.closed_at,
  };
}

function toChallengePayload(challenge) {
  return {
    match_id: challenge.matchId,
    creator_player_id: challenge.creatorPlayerId,
    opponent_player_id: challenge.opponentPlayerId || null,
    creator_team: challenge.creatorTeam,
    opponent_team: challenge.opponentTeam || null,
    stake_amount: challenge.stakeAmount || 0,
    status: challenge.status || "open",
    winner_player_id: challenge.winnerPlayerId || null,
    accepted_at: challenge.acceptedAt || null,
    closed_at: challenge.closedAt || null,
  };
}

export async function listChallenges() {
  if (!isSupabaseConfigured()) {
    return readJson(challengesKey, []);
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("No se pudieron cargar retos.", error);
    return [];
  }

  return data.map(fromChallengeRow);
}

export async function saveChallenge(challenge) {
  if (!isSupabaseConfigured()) {
    const challenges = readJson(challengesKey, []);
    const nextChallenge = {
      ...challenge,
      id: challenge.id || crypto.randomUUID(),
      createdAt: challenge.createdAt || new Date().toISOString(),
    };
    const index = challenges.findIndex((item) => item.id === nextChallenge.id);

    if (index >= 0) {
      challenges[index] = nextChallenge;
    } else {
      challenges.unshift(nextChallenge);
    }

    writeJson(challengesKey, challenges);
    return nextChallenge;
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("challenges")
    .insert(toChallengePayload(challenge))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return fromChallengeRow(data);
}

export async function updateChallenge(challengeId, patch) {
  if (!isSupabaseConfigured()) {
    const challenges = readJson(challengesKey, []);
    const nextChallenges = challenges.map((challenge) =>
      challenge.id === challengeId ? { ...challenge, ...patch } : challenge
    );
    writeJson(challengesKey, nextChallenges);
    return nextChallenges.find((challenge) => challenge.id === challengeId) || null;
  }

  const client = await getSupabaseClient();
  const payload = {};

  if ("opponentPlayerId" in patch) payload.opponent_player_id = patch.opponentPlayerId;
  if ("opponentTeam" in patch) payload.opponent_team = patch.opponentTeam;
  if ("status" in patch) payload.status = patch.status;
  if ("winnerPlayerId" in patch) payload.winner_player_id = patch.winnerPlayerId;
  if ("acceptedAt" in patch) payload.accepted_at = patch.acceptedAt;
  if ("closedAt" in patch) payload.closed_at = patch.closedAt;

  const { data, error } = await client
    .from("challenges")
    .update(payload)
    .eq("id", challengeId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromChallengeRow(data) : null;
}

export async function deleteChallenge(challengeId) {
  if (!isSupabaseConfigured()) {
    const challenges = readJson(challengesKey, []).filter((challenge) => challenge.id !== challengeId);
    writeJson(challengesKey, challenges);
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client.from("challenges").delete().eq("id", challengeId);

  if (error) {
    throw error;
  }
}

export async function clearChallenges() {
  if (!isSupabaseConfigured()) {
    const activeChallenges = readJson(challengesKey, []).filter(
      (challenge) => challenge.status !== "cancelled"
    );
    writeJson(challengesKey, activeChallenges);
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client
    .from("challenges")
    .delete()
    .eq("status", "cancelled");

  if (error) {
    throw error;
  }
}

export async function settleChallengesForMatch(match, challenges) {
  if (!match || match.status !== "finished") {
    return 0;
  }

  const matchChallenges = challenges.filter(
    (challenge) => challenge.matchId === match.id && challenge.status === "accepted"
  );
  const winnerTeam =
    match.homeScore === match.awayScore
      ? null
      : match.homeScore > match.awayScore
        ? match.homeTeam
        : match.awayTeam;
  let settled = 0;

  for (const challenge of matchChallenges) {
    const winnerPlayerId = winnerTeam
      ? winnerTeam === challenge.creatorTeam
        ? challenge.creatorPlayerId
        : challenge.opponentPlayerId
      : null;

    await updateChallenge(challenge.id, {
      status: winnerTeam ? "closed" : "draw",
      winnerPlayerId,
      closedAt: new Date().toISOString(),
    });
    settled += 1;
  }

  return settled;
}
