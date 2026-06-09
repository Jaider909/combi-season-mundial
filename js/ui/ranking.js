import { escapeHtml } from "./dom.js";

function countPredictions(predictions, playerId) {
  return predictions.filter((prediction) => prediction.playerId === playerId).length;
}

function countScoredPredictions(predictions, playerId) {
  return predictions.filter(
    (prediction) => prediction.playerId === playerId && (prediction.estimatedPoints || 0) > 0
  ).length;
}

function getSortedUsers(users, predictions) {
  return [...users].sort((a, b) => {
    const pointsDiff = (b.points || 0) - (a.points || 0);

    if (pointsDiff !== 0) {
      return pointsDiff;
    }

    return countPredictions(predictions, b.id) - countPredictions(predictions, a.id);
  });
}

function renderSpotlight(sortedUsers, predictions, currentUser) {
  const spotlight = document.querySelector("#rankingSpotlight");
  const totalPredictions = predictions.length;
  const leader = sortedUsers[0];
  const currentIndex = currentUser
    ? sortedUsers.findIndex((user) => user.id === currentUser.id)
    : -1;
  const currentPredictionCount =
    currentIndex >= 0 ? countPredictions(predictions, currentUser.id) : 0;
  const currentPoints = currentIndex >= 0 ? sortedUsers[currentIndex].points || 0 : 0;

  spotlight.innerHTML = `
    <article>
      <span>Líder actual</span>
      <strong>${leader ? escapeHtml(leader.alias) : "-"}</strong>
      <small>${leader ? `${leader.points || 0} pts · ${escapeHtml(leader.team)}` : "Sin jugadores"}</small>
    </article>
    <article class="${currentIndex >= 0 ? "is-current" : ""}">
      <span>Tu posición</span>
      <strong>${currentIndex >= 0 ? `#${currentIndex + 1}` : "-"}</strong>
      <small>${currentIndex >= 0 ? `${currentPoints} pts · ${currentPredictionCount} predicciones` : "Inicia sesión para verte aquí"}</small>
    </article>
    <article>
      <span>Jugadores</span>
      <strong>${sortedUsers.length}</strong>
      <small>${totalPredictions} predicciones totales</small>
    </article>
  `;
}

export function renderRanking(users, predictions, currentUser = null) {
  const rankingTable = document.querySelector("#rankingTable");
  const sortedUsers = getSortedUsers(users, predictions);

  if (!users.length) {
    renderSpotlight([], predictions, currentUser);
    rankingTable.innerHTML = '<div class="empty-admin">Aún no hay jugadores registrados.</div>';
    return;
  }

  renderSpotlight(sortedUsers, predictions, currentUser);

  const rows = sortedUsers
    .map((user, index) => {
      const predictionCount = countPredictions(predictions, user.id);
      const scoredCount = countScoredPredictions(predictions, user.id);
      const currentClass = currentUser?.id === user.id ? " is-current-user" : "";

      return `
        <div class="leaderboard-row${currentClass}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>
            ${escapeHtml(user.alias)}
            <small>${escapeHtml(user.name)} · ${predictionCount} predicciones</small>
          </strong>
          <span>${escapeHtml(user.team)}</span>
          <span>${scoredCount} aciertos</span>
          <strong>${user.points || 0}</strong>
        </div>
      `;
    })
    .join("");

  rankingTable.innerHTML = `
    <div class="leaderboard-row header-row">
      <span>Pos</span>
      <span>Jugador</span>
      <span>Equipo</span>
      <span>Aciertos</span>
      <span>Puntos</span>
    </div>
    ${rows}
  `;
}
