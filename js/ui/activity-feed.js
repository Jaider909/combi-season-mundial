import { escapeHtml } from "./dom.js?v=safe-text";
import { formatMatchLabel, formatTeamLabel } from "../config/team-flags.js?v=team-flags";

function formatDate(value) {
  if (!value) {
    return "Ahora";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getUser(users, playerId) {
  return users.find((user) => user.id === playerId) || null;
}

function getMatch(matches, matchId) {
  return matches.find((match) => match.id === matchId) || null;
}

function userLabel(user) {
  return user?.alias || user?.name || "Jugador";
}

function matchLabel(match) {
  return match ? formatMatchLabel(match) : "partido";
}

function getChallengeEvents(challenges, matches, users) {
  return challenges.flatMap((challenge) => {
    if (challenge.status === "cancelled") {
      return [];
    }

    const match = getMatch(matches, challenge.matchId);
    const creator = getUser(users, challenge.creatorPlayerId);
    const opponent = getUser(users, challenge.opponentPlayerId);
    const events = [
      {
        type: "Reto",
        date: challenge.createdAt,
        title: `${userLabel(creator)} lanzó un reto`,
        detail: `${matchLabel(match)} · va con ${formatTeamLabel(challenge.creatorTeam)}`,
      },
    ];

    if (challenge.acceptedAt && opponent) {
      events.push({
        type: "Reto aceptado",
        date: challenge.acceptedAt,
        title: `${userLabel(opponent)} aceptó un reto`,
        detail: `${matchLabel(match)} · va con ${formatTeamLabel(challenge.opponentTeam)}`,
      });
    }

    if (challenge.closedAt && ["closed", "draw"].includes(challenge.status)) {
      const winner = getUser(users, challenge.winnerPlayerId);
      events.push({
        type: "Reto cerrado",
        date: challenge.closedAt,
        title: challenge.status === "draw" ? "Reto empatado" : `${userLabel(winner)} ganó un reto`,
        detail: `${matchLabel(match)} · ${challenge.status === "draw" ? "empate app" : "90% para ganador"}`,
      });
    }

    return events;
  });
}

function getPredictionEvents(predictions, matches, users) {
  return predictions.map((prediction) => {
    const match = getMatch(matches, prediction.matchId);
    const user = getUser(users, prediction.playerId);

    return {
      type: "Predicción",
      date: prediction.savedAt,
      title: `${userLabel(user)} guardó predicción`,
      detail: `${matchLabel(match)} · ${prediction.homeScore}-${prediction.awayScore}`,
    };
  });
}

function getResultEvents(matches) {
  return matches
    .filter((match) => match.status === "finished")
    .map((match) => ({
      type: "Resultado",
      date: match.date,
      title: `Resultado cerrado`,
      detail: `${formatTeamLabel(match.homeTeam)} ${match.homeScore}-${match.awayScore} ${formatTeamLabel(match.awayTeam)}`,
    }));
}

export function buildActivityFeed({ challenges = [], predictions = [], matches = [], users = [] }) {
  return [
    ...getChallengeEvents(challenges, matches, users),
    ...getPredictionEvents(predictions, matches, users),
    ...getResultEvents(matches),
  ]
    .filter((event) => event.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);
}

export function renderActivityFeed(containerId, events = []) {
  const container = document.querySelector(containerId);

  if (!container) {
    return;
  }

  if (!events.length) {
    container.innerHTML = '<div class="empty-admin">Aún no hay actividad para mostrar.</div>';
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <article class="activity-item">
          <span>${escapeHtml(event.type)}</span>
          <strong>${escapeHtml(event.title)}</strong>
          <small>${escapeHtml(event.detail)} · ${escapeHtml(formatDate(event.date))}</small>
        </article>
      `
    )
    .join("");
}
