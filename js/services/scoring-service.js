function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parsePredictedScorers(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function countMatchingScorers(players = [], predictedScorers) {
  const realPlayers = new Set(players.map(normalizeName).filter(Boolean));
  const uniquePredictions = new Set(parsePredictedScorers(predictedScorers).map(normalizeName));

  return [...uniquePredictions].filter((playerName) => realPlayers.has(playerName)).length;
}

export function calculatePredictionPoints(prediction, match) {
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
    countMatchingScorers(match.homeScorers, prediction.homeScorer) * 2 +
    countMatchingScorers(match.awayScorers, prediction.awayScorer) * 2;

  if (exactScore) {
    return 8 + scorerPoints;
  }

  const predictedDiff = Math.sign(prediction.homeScore - prediction.awayScore);
  const realDiff = Math.sign(match.homeScore - match.awayScore);

  if (predictedDiff === realDiff) {
    return 3 + scorerPoints;
  }

  return scorerPoints;
}

export function sumPlayerPoints(predictions, playerId) {
  return predictions
    .filter((prediction) => prediction.playerId === playerId)
    .reduce((total, prediction) => total + (prediction.estimatedPoints || 0), 0);
}
