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

function isOwnGoal(value) {
  return normalizeName(value).startsWith("autogol");
}

function countMatchingScorers(players = [], predictedScorers) {
  const realPlayers = new Set(
    players
      .filter((player) => !isOwnGoal(player))
      .map(normalizeName)
      .filter(Boolean)
  );
  const uniquePredictions = new Set(
    parsePredictedScorers(predictedScorers)
      .filter((player) => !isOwnGoal(player))
      .map(normalizeName)
  );

  return [...uniquePredictions].filter((playerName) => realPlayers.has(playerName)).length;
}

const EXACT_SCORE_POINTS = 8;
const WINNER_POINTS = 3;
const SCORER_POINTS = 2;

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
    countMatchingScorers(match.homeScorers, prediction.homeScorer) * SCORER_POINTS +
    countMatchingScorers(match.awayScorers, prediction.awayScorer) * SCORER_POINTS;

  const predictedDiff = Math.sign(prediction.homeScore - prediction.awayScore);
  const realDiff = Math.sign(match.homeScore - match.awayScore);
  const winnerPoints = predictedDiff === realDiff ? WINNER_POINTS : 0;
  const exactScorePoints = exactScore ? EXACT_SCORE_POINTS : 0;

  return exactScorePoints + winnerPoints + scorerPoints;
}

export function sumPlayerPoints(predictions, playerId) {
  return predictions
    .filter((prediction) => prediction.playerId === playerId)
    .reduce((total, prediction) => total + (prediction.estimatedPoints || 0), 0);
}
