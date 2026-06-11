import { escapeHtml, setText } from "./dom.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTopTeam(users) {
  const counts = users.reduce((summary, user) => {
    summary[user.team] = (summary[user.team] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function countPredictions(predictions, playerId) {
  return predictions.filter((prediction) => prediction.playerId === playerId).length;
}

function getMatchPredictionCount(predictions, matchId) {
  return predictions.filter((prediction) => prediction.matchId === matchId).length;
}

function getUserById(users, userId) {
  return users.find((user) => user.id === userId) || null;
}

function getUserByEmail(users, email) {
  return users.find((user) => user.email?.toLowerCase() === email?.toLowerCase()) || null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getMatchById(matches, matchId) {
  return matches.find((match) => match.id === matchId) || null;
}

function getChallengeStatusLabel(status) {
  const labels = {
    open: "Abierto",
    accepted: "Aceptado",
    closed: "Cerrado",
    cancelled: "Cancelado",
    draw: "Empate app",
  };

  return labels[status] || status;
}

function renderDrawParticipants(users, participants = []) {
  const drawSummary = document.querySelector("#drawSummary");
  const drawParticipantsTable = document.querySelector("#drawParticipantsTable");

  if (!drawSummary || !drawParticipantsTable) {
    return;
  }

  if (!participants.length) {
    drawSummary.innerHTML = "";
    drawParticipantsTable.innerHTML = '<div class="empty-admin">Aún no hay participantes del sorteo cargados.</div>';
    return;
  }

  const registeredCount = participants.filter((participant) => getUserByEmail(users, participant.email)).length;
  const pendingCount = participants.length - registeredCount;
  const teams = new Set(participants.map((participant) => participant.team));

  drawSummary.innerHTML = `
    <article>
      <span>Total sorteados</span>
      <strong>${participants.length}</strong>
    </article>
    <article>
      <span>Registrados</span>
      <strong>${registeredCount}</strong>
    </article>
    <article>
      <span>Pendientes</span>
      <strong>${pendingCount}</strong>
    </article>
    <article>
      <span>Selecciones bloqueadas</span>
      <strong>${teams.size}</strong>
    </article>
  `;

  const rows = [...participants]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((participant) => {
      const user = getUserByEmail(users, participant.email);
      const isRegistered = Boolean(user);

      return `
        <div class="admin-row draw-row ${isRegistered ? "is-registered" : "is-pending"}">
          <span><strong>${escapeHtml(participant.name)}</strong><br>${escapeHtml(participant.team)}</span>
          <span>${escapeHtml(participant.email || "Sin correo")}</span>
          <span>
            <span class="payment-chip ${isRegistered ? "is-success" : "is-muted"}">
              ${isRegistered ? "Registrado" : "Pendiente"}
            </span>
          </span>
          <span>${isRegistered ? `${user.points || 0} pts` : "Sin actividad"}</span>
          <span>${isRegistered ? formatDate(user.registeredAt) : "Aún no entra"}</span>
        </div>
      `;
    })
    .join("");

  drawParticipantsTable.innerHTML = `
    <div class="admin-row draw-row header-row">
      <span>Participante</span>
      <span>Correo</span>
      <span>Estado</span>
      <span>Puntos</span>
      <span>Registro</span>
    </div>
    ${rows}
  `;
}

function renderAdminChallenges(users, matches, challenges = []) {
  const summary = document.querySelector("#adminChallengeSummary");
  const table = document.querySelector("#adminChallengesTable");

  if (!summary || !table) {
    return;
  }

  const activeChallenges = challenges.filter((challenge) => challenge.status !== "cancelled");
  const acceptedCount = activeChallenges.filter((challenge) => challenge.status === "accepted").length;
  const openCount = activeChallenges.filter((challenge) => challenge.status === "open").length;
  const closedCount = activeChallenges.filter((challenge) => ["closed", "draw"].includes(challenge.status)).length;
  const totalStake = activeChallenges.reduce((sum, challenge) => sum + (challenge.stakeAmount || 0) * 2, 0);
  const closedChallenges = activeChallenges.filter((challenge) => ["closed", "draw"].includes(challenge.status));
  const projectedFee = activeChallenges.reduce((sum, challenge) => {
    const total = (challenge.stakeAmount || 0) * 2;
    return sum + (challenge.status === "draw" ? total : Math.round(total * 0.1));
  }, 0);
  const earnedFee = closedChallenges.reduce((sum, challenge) => {
    const total = (challenge.stakeAmount || 0) * 2;
    return sum + (challenge.status === "draw" ? total : Math.round(total * 0.1));
  }, 0);

  summary.innerHTML = `
    <article>
      <span>Retos abiertos</span>
      <strong>${openCount}</strong>
    </article>
    <article>
      <span>Retos activos</span>
      <strong>${acceptedCount}</strong>
    </article>
    <article>
      <span>Cerrados</span>
      <strong>${closedCount}</strong>
    </article>
    <article>
      <span>Bolsa referenciada</span>
      <strong>${formatCurrency(totalStake)}</strong>
    </article>
    <article>
      <span>App cobrado</span>
      <strong>${formatCurrency(earnedFee)}</strong>
    </article>
    <article>
      <span>App proyectado</span>
      <strong>${formatCurrency(projectedFee)}</strong>
    </article>
  `;

  if (!activeChallenges.length) {
    table.innerHTML = '<div class="empty-admin">Aún no hay retos creados.</div>';
    return;
  }

  const rows = activeChallenges
    .map((challenge) => {
      const match = getMatchById(matches, challenge.matchId);
      const creator = getUserById(users, challenge.creatorPlayerId);
      const opponent = getUserById(users, challenge.opponentPlayerId);
      const winner = getUserById(users, challenge.winnerPlayerId);
      const total = (challenge.stakeAmount || 0) * 2;
      const fee = challenge.status === "draw" ? total : Math.round(total * 0.1);
      const payout = challenge.status === "draw" ? 0 : total - fee;

      return `
        <div class="admin-row challenge-admin-row">
          <span>
            <strong>${escapeHtml(match ? `${match.homeTeam} vs ${match.awayTeam}` : "Partido no encontrado")}</strong>
            <br>${match ? `Partido ${match.matchNumber || "-"}` : ""}
          </span>
          <span>${escapeHtml(creator?.alias || creator?.name || "Jugador")}<br>${escapeHtml(challenge.creatorTeam)}</span>
          <span>${escapeHtml(opponent?.alias || opponent?.name || "Sin rival")}<br>${escapeHtml(challenge.opponentTeam || "-")}</span>
          <span>${formatCurrency(challenge.stakeAmount)}<br>Bolsa ${formatCurrency(total)}</span>
          <span><span class="payment-chip">${escapeHtml(getChallengeStatusLabel(challenge.status))}</span><br>App ${formatCurrency(fee)}<br>Premio ${formatCurrency(payout)}</span>
          <span>${escapeHtml(winner?.alias || winner?.name || (challenge.status === "draw" ? "App" : "-"))}</span>
        </div>
      `;
    })
    .join("");

  table.innerHTML = `
    <div class="admin-row challenge-admin-row header-row">
      <span>Partido</span>
      <span>Creador</span>
      <span>Rival</span>
      <span>Valor</span>
      <span>Estado</span>
      <span>Ganador</span>
    </div>
    ${rows}
  `;
}

function renderSelectedMatchDetail(users, predictions, match) {
  const detail = document.querySelector("#adminMatchDetail");

  if (!match) {
    detail.innerHTML = '<div class="empty-admin">Selecciona un partido para ver sus predicciones.</div>';
    return;
  }

  const matchPredictions = predictions.filter((prediction) => prediction.matchId === match.id);
  const score =
    match.status === "finished"
      ? `${match.homeScore} - ${match.awayScore}`
      : "Sin resultado";
  const scorers = [...(match.homeScorers || []), ...(match.awayScorers || [])].join(", ") || "Sin goleadores";
  const rows = matchPredictions.length
    ? matchPredictions
        .map((prediction) => {
          const user = getUserById(users, prediction.playerId);

          return `
            <div class="admin-prediction-row">
              <span>
                <strong>${escapeHtml(user?.alias || "Jugador")}</strong>
                <small>${escapeHtml(user?.email || "")}</small>
              </span>
              <span>${prediction.homeScore} - ${prediction.awayScore}</span>
              <span>${escapeHtml(prediction.homeScorer || "Sin goleador")} / ${escapeHtml(
                prediction.awayScorer || "Sin goleador"
              )}</span>
              <strong>${prediction.estimatedPoints || 0} pts</strong>
            </div>
          `;
        })
        .join("")
    : '<div class="empty-admin">Este partido aún no tiene predicciones.</div>';

  detail.innerHTML = `
    <div class="admin-match-summary">
      <div>
        <span>Partido seleccionado</span>
        <strong>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</strong>
      </div>
      <div>
        <span>Estado</span>
        <strong>${escapeHtml(match.status)}</strong>
      </div>
      <div>
        <span>Resultado</span>
        <strong>${escapeHtml(score)}</strong>
      </div>
      <div>
        <span>Predicciones</span>
        <strong>${matchPredictions.length}</strong>
      </div>
      <div>
        <span>Goleadores</span>
        <strong>${escapeHtml(scorers)}</strong>
      </div>
    </div>
    <div class="admin-prediction-table">
      <div class="admin-prediction-row header-row">
        <span>Jugador</span>
        <span>Marcador</span>
        <span>Goleadores</span>
        <span>Puntos</span>
      </div>
      ${rows}
    </div>
  `;
}

export function renderAdmin(
  users,
  predictions = [],
  matches = [],
  selectedMatchId = null,
  participants = [],
  challenges = []
) {
  const adminUsersTable = document.querySelector("#adminUsersTable");
  const adminMatchesTable = document.querySelector("#adminMatchesTable");
  const resultMatchSelect = document.querySelector("#resultMatchSelect");
  const average = users.length ? (predictions.length / users.length).toFixed(1) : "0";
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || matches[0] || null;

  setText("#adminTotalUsers", users.length);
  setText("#adminPendingPayments", users.length);
  setText("#adminTotalPredictions", predictions.length);
  setText("#adminPredictionAverage", average);
  setText("#adminTopTeam", getTopTeam(users));
  renderDrawParticipants(users, participants);
  renderAdminChallenges(users, matches, challenges);

  resultMatchSelect.innerHTML = matches
    .map(
      (match) => `
        <option value="${match.id}" ${match.id === selectedMatchId ? "selected" : ""}>
          Partido ${match.matchNumber || "-"} · ${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}
        </option>
      `
    )
    .join("");

  renderSelectedMatchDetail(users, predictions, selectedMatch);

  if (!users.length) {
    adminUsersTable.innerHTML = '<div class="empty-admin">Aún no hay usuarios registrados.</div>';
    return;
  }

  const rows = users
    .map(
      (user) => `
        <div class="admin-row">
          <span><strong>${escapeHtml(user.alias)}</strong><br>${escapeHtml(user.name)}</span>
          <span>${escapeHtml(user.email)}</span>
          <span>${escapeHtml(user.phone)}</span>
          <span>${escapeHtml(user.team)}</span>
          <span>${user.points || 0} pts<br>${countPredictions(predictions, user.id)} predicciones</span>
          <span><span class="payment-chip">${escapeHtml(user.paymentStatus)}</span><br>${formatDate(user.registeredAt)}</span>
        </div>
      `
    )
    .join("");

  adminUsersTable.innerHTML = `
    <div class="admin-row header-row">
      <span>Jugador</span>
      <span>Email</span>
      <span>WhatsApp</span>
      <span>Equipo</span>
      <span>Actividad</span>
      <span>Estado</span>
    </div>
    ${rows}
  `;

  if (!matches.length) {
    adminMatchesTable.innerHTML = '<div class="empty-admin">Aún no hay partidos cargados.</div>';
    return;
  }

  const matchRows = [...matches]
    .sort((a, b) => getMatchPredictionCount(predictions, b.id) - getMatchPredictionCount(predictions, a.id))
    .slice(0, 12)
    .map((match) => {
      const total = getMatchPredictionCount(predictions, match.id);
      const isFinished = match.status === "finished";
      const isLocked = match.status === "locked";
      const actionButton = match.status === "open"
        ? `
            <button
              class="mini-action mini-action-danger"
              type="button"
              data-lock-match="${match.id}"
            >
              Cerrar predicciones
            </button>
          `
        : `
            <button
              class="mini-action"
              type="button"
              data-reopen-match="${match.id}"
              ${isFinished || isLocked ? "" : "disabled"}
            >
              Reabrir predicciones
            </button>
          `;

      return `
        <div class="admin-row match-admin-row" data-admin-select-match="${match.id}">
          <span><strong>Partido ${match.matchNumber || "-"}</strong><br>${formatDate(match.date)}</span>
          <span>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</span>
          <span>${escapeHtml(match.phase)}</span>
          <span>${total} predicciones</span>
          <span>
            <span class="payment-chip">${escapeHtml(match.status)}</span>
            ${actionButton}
          </span>
        </div>
      `;
    })
    .join("");

  adminMatchesTable.innerHTML = `
    <div class="admin-row match-admin-row header-row">
      <span>Fecha</span>
      <span>Partido</span>
      <span>Grupo</span>
      <span>Actividad</span>
      <span>Estado</span>
    </div>
    ${matchRows}
  `;
}
