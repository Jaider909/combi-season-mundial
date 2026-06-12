import { escapeHtml } from "./dom.js?v=safe-text";

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatMatch(match) {
  if (!match) {
    return "Partido no encontrado";
  }

  return `Partido ${match.matchNumber || "-"} · ${match.homeTeam} vs ${match.awayTeam}`;
}

function getPlayerName(users, playerId) {
  const user = users.find((item) => item.id === playerId);

  return user?.alias || user?.name || "Jugador";
}

function getChallengeShareUrl(challenge, match, creator) {
  const appUrl = `${window.location.origin}${window.location.pathname}#retos`;
  const total = (challenge.stakeAmount || 0) * 2;
  const opponentTeam = match
    ? challenge.creatorTeam === match.homeTeam
      ? match.awayTeam
      : match.homeTeam
    : "el otro equipo";
  const text = [
    `Reto COMBI SEASON: ${creator} va con ${challenge.creatorTeam}.`,
    match ? `Partido: ${match.homeTeam} vs ${match.awayTeam}.` : "",
    `Valor: ${formatCurrency(challenge.stakeAmount)} por jugador. Bolsa: ${formatCurrency(total)}.`,
    `Acepta el reto con ${opponentTeam}: ${appUrl}`,
  ]
    .filter(Boolean)
    .join(" ");

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function getChallengeState(challenge, activeUser) {
  if (challenge.status === "open") {
    return challenge.creatorPlayerId === activeUser?.id ? "Esperando rival" : "Disponible";
  }

  if (challenge.status === "accepted") {
    return "Activo";
  }

  if (challenge.status === "draw") {
    return "Empate · app";
  }

  if (challenge.status === "cancelled") {
    return "Cancelado";
  }

  return challenge.winnerPlayerId === activeUser?.id ? "Ganado" : "Cerrado";
}

function getChallengeStateClass(challenge) {
  return `is-${challenge.status || "open"}`;
}

function getChallengeOutcome(challenge, activeUser, winnerName) {
  if (challenge.status === "open") {
    return challenge.creatorPlayerId === activeUser?.id
      ? "Comparte el enlace para conseguir rival."
      : "Puedes tomar el lado contrario y dejarlo activo.";
  }

  if (challenge.status === "accepted") {
    return "Queda pendiente hasta que el admin cierre el resultado del partido.";
  }

  if (challenge.status === "draw") {
    return "El partido quedó empatado: la app conserva el 100% de la bolsa.";
  }

  if (challenge.status === "closed") {
    return `Ganador del reto: ${winnerName}.`;
  }

  return "Reto cancelado.";
}

export function renderChallengeForm(matches = [], activeUser = null) {
  const matchSelect = document.querySelector("#challengeMatchSelect");
  const teamSelect = document.querySelector("#challengeTeamSelect");

  if (!matchSelect || !teamSelect) {
    return;
  }

  const openMatches = matches.filter((match) => match.status === "open");
  matchSelect.innerHTML = openMatches
    .map(
      (match) => `
        <option value="${match.id}">
          ${escapeHtml(formatMatch(match))}
        </option>
      `
    )
    .join("");

  renderChallengeTeamOptions(matches, activeUser);
}

export function renderChallengeTeamOptions(matches = [], activeUser = null) {
  const matchSelect = document.querySelector("#challengeMatchSelect");
  const teamSelect = document.querySelector("#challengeTeamSelect");

  if (!matchSelect || !teamSelect) {
    return;
  }

  const match = matches.find((item) => item.id === matchSelect.value) || matches.find((item) => item.status === "open");

  if (!match) {
    teamSelect.innerHTML = '<option value="">Sin partidos abiertos</option>';
    return;
  }

  teamSelect.innerHTML = [match.homeTeam, match.awayTeam]
    .map(
      (team) => `
        <option value="${escapeHtml(team)}" ${team === activeUser?.team ? "selected" : ""}>
          ${escapeHtml(team)}
        </option>
      `
    )
    .join("");
}

export function renderChallenges(challenges = [], matches = [], users = [], activeUser = null) {
  const openList = document.querySelector("#openChallengesList");
  const myList = document.querySelector("#myChallengesList");
  const summary = document.querySelector("#challengeSummaryCards");

  if (!openList || !myList || !summary) {
    return;
  }

  const visibleChallenges = challenges.filter((challenge) => challenge.status !== "cancelled");
  const userChallenges = visibleChallenges.filter(
    (challenge) =>
      challenge.creatorPlayerId === activeUser?.id || challenge.opponentPlayerId === activeUser?.id
  );
  const openChallenges = visibleChallenges.filter(
    (challenge) => challenge.status === "open" && challenge.creatorPlayerId !== activeUser?.id
  );
  const activeCount = userChallenges.filter((challenge) => challenge.status === "accepted").length;
  const wonCount = userChallenges.filter((challenge) => challenge.winnerPlayerId === activeUser?.id).length;
  const amountInPlay = userChallenges
    .filter((challenge) => ["open", "accepted"].includes(challenge.status))
    .reduce((sum, challenge) => sum + (challenge.stakeAmount || 0), 0);
  const wonAmount = userChallenges
    .filter((challenge) => challenge.winnerPlayerId === activeUser?.id)
    .reduce((sum, challenge) => sum + Math.round((challenge.stakeAmount || 0) * 2 * 0.9), 0);

  summary.innerHTML = `
    <article>
      <span>Mis retos</span>
      <strong>${userChallenges.length}</strong>
    </article>
    <article>
      <span>Activos</span>
      <strong>${activeCount}</strong>
    </article>
    <article>
      <span>Ganados</span>
      <strong>${wonCount}</strong>
    </article>
    <article>
      <span>En juego</span>
      <strong>${formatCurrency(amountInPlay)}</strong>
    </article>
    <article>
      <span>Ganado</span>
      <strong>${formatCurrency(wonAmount)}</strong>
    </article>
  `;

  openList.innerHTML = openChallenges.length
    ? openChallenges.map((challenge) => renderChallengeCard(challenge, matches, users, activeUser, "open")).join("")
    : '<div class="empty-admin">No hay retos abiertos por otros jugadores.</div>';

  myList.innerHTML = userChallenges.length
    ? userChallenges.map((challenge) => renderChallengeCard(challenge, matches, users, activeUser, "mine")).join("")
    : '<div class="empty-admin">Todavía no tienes retos.</div>';
}

function renderChallengeCard(challenge, matches, users, activeUser, mode) {
  const match = matches.find((item) => item.id === challenge.matchId);
  const creator = getPlayerName(users, challenge.creatorPlayerId);
  const opponent = challenge.opponentPlayerId ? getPlayerName(users, challenge.opponentPlayerId) : "Sin rival";
  const winner = challenge.winnerPlayerId ? getPlayerName(users, challenge.winnerPlayerId) : "App";
  const total = (challenge.stakeAmount || 0) * 2;
  const payout = Math.round(total * 0.9);
  const fee = total - payout;
  const otherTeam = match
    ? challenge.creatorTeam === match.homeTeam
      ? match.awayTeam
      : match.homeTeam
    : "";
  const canAccept = mode === "open" && challenge.status === "open";
  const canCancel = mode === "mine" && challenge.status === "open" && challenge.creatorPlayerId === activeUser?.id;
  const canShare = challenge.status === "open";
  const shareUrl = getChallengeShareUrl(challenge, match, creator);
  const stateClass = getChallengeStateClass(challenge);
  const outcome = getChallengeOutcome(challenge, activeUser, winner);

  return `
    <article class="challenge-card ${stateClass}">
      <div>
        <span class="challenge-state ${stateClass}">${escapeHtml(getChallengeState(challenge, activeUser))}</span>
        <h4>${escapeHtml(formatMatch(match))}</h4>
        <div class="challenge-versus">
          <span><strong>${escapeHtml(creator)}</strong><small>${escapeHtml(challenge.creatorTeam)}</small></span>
          <em>vs</em>
          <span><strong>${escapeHtml(opponent)}</strong><small>${escapeHtml(challenge.opponentTeam || otherTeam || "-")}</small></span>
        </div>
        <p>${escapeHtml(outcome)}</p>
      </div>
      <div class="challenge-money">
        <div>
          <span>Valor por jugador</span>
          <strong>${formatCurrency(challenge.stakeAmount)}</strong>
        </div>
        <div class="challenge-money-grid">
          <small><b>${formatCurrency(total)}</b> bolsa</small>
          <small><b>${formatCurrency(payout)}</b> ganador</small>
          <small><b>${formatCurrency(fee)}</b> app</small>
          <small><b>${formatCurrency(total)}</b> app si empate</small>
        </div>
      </div>
      <div class="challenge-actions">
        ${
          canShare
            ? `<a class="btn btn-whatsapp" href="${shareUrl}" target="_blank" rel="noopener">Compartir WhatsApp</a>`
            : ""
        }
        ${
          canAccept
            ? `<button class="btn btn-secondary" type="button" data-accept-challenge="${challenge.id}" data-opponent-team="${escapeHtml(otherTeam)}">Aceptar ${escapeHtml(otherTeam)}</button>`
            : ""
        }
        ${
          canCancel
            ? `<button class="mini-action" type="button" data-cancel-challenge="${challenge.id}">Cancelar</button>`
            : ""
        }
      </div>
    </article>
  `;
}
