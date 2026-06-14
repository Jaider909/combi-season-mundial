import { readJson, writeJson } from "./storage.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

const predictionsKey = "combiSeasonPredictions";

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
    savedAt: row.created_at,
  };
}

export async function listPredictions() {
  if (!isSupabaseConfigured()) {
    return readJson(predictionsKey, []);
  }

  const client = await getSupabaseClient();
  const { data, error } = await client.from("predictions").select("*");

  if (error) {
    throw error;
  }

  return data.map(fromPredictionRow);
}

export function listLocalPredictions() {
  return readJson(predictionsKey, []);
}

export async function savePrediction(prediction) {
  if (isSupabaseConfigured() && prediction.playerId) {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("predictions")
      .upsert(
        {
          player_id: prediction.playerId,
          match_id: prediction.matchId,
          predicted_home_score: prediction.homeScore,
          predicted_away_score: prediction.awayScore,
          predicted_home_scorer: prediction.homeScorer || null,
          predicted_away_scorer: prediction.awayScorer || null,
          points_awarded: prediction.estimatedPoints || 0,
        },
        { onConflict: "player_id,match_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return fromPredictionRow(data);
  }

  const predictions = listLocalPredictions();
  const existingIndex = predictions.findIndex(
    (item) => item.email === prediction.email && item.matchId === prediction.matchId
  );
  const existingPrediction = existingIndex >= 0 ? predictions[existingIndex] : null;
  const now = new Date().toISOString();
  const nextPrediction = {
    ...prediction,
    savedAt: prediction.savedAt || existingPrediction?.savedAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    predictions[existingIndex] = nextPrediction;
  } else {
    predictions.unshift(nextPrediction);
  }

  writeJson(predictionsKey, predictions);
  return nextPrediction;
}

export async function deletePrediction(prediction) {
  if (!prediction) {
    return;
  }

  if (isSupabaseConfigured() && prediction.id) {
    const client = await getSupabaseClient();
    const { error } = await client.from("predictions").delete().eq("id", prediction.id);

    if (error) {
      throw error;
    }

    return;
  }

  const predictions = listLocalPredictions().filter((item) => {
    if (prediction.id) {
      return item.id !== prediction.id;
    }

    return !(item.email === prediction.email && item.matchId === prediction.matchId);
  });
  writeJson(predictionsKey, predictions);
}

export async function updatePredictionPoints(predictionId, points) {
  if (!isSupabaseConfigured()) {
    const predictions = listLocalPredictions().map((prediction) =>
      prediction.id === predictionId ? { ...prediction, estimatedPoints: points } : prediction
    );
    writeJson(predictionsKey, predictions);
    return;
  }

  const client = await getSupabaseClient();
  const { error } = await client
    .from("predictions")
    .update({ points_awarded: points })
    .eq("id", predictionId);

  if (error) {
    throw error;
  }
}

export function getLocalPredictionForUser(email, matchId) {
  return (
    listLocalPredictions().find(
      (prediction) => prediction.email === email && prediction.matchId === matchId
    ) || null
  );
}

export function getPredictionForPlayer(predictions, playerId, matchId) {
  return (
    predictions.find(
      (prediction) => prediction.playerId === playerId && prediction.matchId === matchId
    ) || null
  );
}

export function countPredictionsForPlayer(predictions, playerId) {
  return predictions.filter((prediction) => prediction.playerId === playerId).length;
}
