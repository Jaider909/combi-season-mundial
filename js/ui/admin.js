import { qualifiedTeams } from "../config/teams.js";
import { escapeHtml, setText } from "./dom.js?v=safe-text";
import { formatMatchLabel, formatTeamLabel } from "../config/team-flags.js?v=team-flags";
import { getMatchStatusView, isLiveMatch } from "./match-status.js?v=admin-open";

function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPredictionTime(value) {
  if (!value) {
    return "Sin fecha registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha registrada";
  }

  return formatDate(date);
}

function getBogotaDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}

function getTopTeam(users) {
  const counts = users.reduce((summary, user) => {
    summary[user.team] = (summary[user.team] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function countPredictions(predictions, playerId) {
  return predictions.filter((prediction) => prediction.playerId === playerId).length;
}

function getMatchPredictionCount(predictions, matchId) {
  return predictions.filter((prediction) => prediction.matchId === matchId).length;
}

function getMissingPredictions(users, predictions, matchId) {
  const predictedPlayerIds = new Set(
    predictions.filter((prediction) => prediction.matchId === matchId).map((prediction) => prediction.playerId)
  );

  return users.filter((user) => user?.id && !predictedPlayerIds.has(user.id));
}

function sortMatchesByNumber(matches) {
  return [...matches].sort((a, b) => {
    const numberA = Number(a.matchNumber);
    const numberB = Number(b.matchNumber);

    if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
      return numberA - numberB;
    }

    return new Date(a.date) - new Date(b.date);
  });
}

function sortMatchesByDate(matches) {
  return [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderMatchActionButton(match) {
  const isFinished = match.status === "finished";
  const isLocked = match.status === "locked";

  if (match.status === "open" || match.status === "admin_open") {
    return `
      <button
        class="mini-action mini-action-danger"
        type="button"
        data-lock-match="${match.id}"
      >
        Cerrar predicciones
      </button>
    `;
  }

  return `
    <button
      class="mini-action"
      type="button"
      data-reopen-match="${match.id}"
      ${isFinished || isLocked ? "" : "disabled"}
    >
      Reabrir para jugadores
    </button>
  `;
}

function getResultSourceLabel(match) {
  if (match.resultSource === "automatic") {
    return "Automático";
  }

  if (match.resultSource === "manual" || match.status === "finished") {
    return "Manual";
  }

  return "Sin resultado";
}

function getResultReviewLabel(match) {
  if (match.resultReviewStatus === "reviewed") {
    return "Revisado";
  }

  if (match.resultReviewStatus === "needs_review" || match.resultSource === "automatic") {
    return "Pendiente revisión";
  }

  if (match.status === "finished") {
    return "Revisado";
  }

  return "Pendiente";
}

function getResultReviewClass(match) {
  const label = getResultReviewLabel(match);

  if (label === "Revisado") {
    return " is-success";
  }

  if (label === "Pendiente revisión") {
    return " is-warning";
  }

  return " is-muted";
}

function renderMatchRow(match, total) {
  const statusView = getMatchStatusView(match);

  return `
    <div class="admin-row match-admin-row" data-admin-select-match="${match.id}">
      <span><strong>Partido ${match.matchNumber || "-"}</strong><br>${formatDate(match.date)}</span>
      <span>${escapeHtml(formatMatchLabel(match))}</span>
      <span>${escapeHtml(match.phase)}</span>
      <span>${total} predicciones</span>
      <span>
        <span class="payment-chip match-state-chip ${statusView.className}">${escapeHtml(statusView.label)}</span>
        ${match.status === "finished"
          ? `<span class="payment-chip${getResultReviewClass(match)}">${escapeHtml(
              getResultSourceLabel(match)
            )} · ${escapeHtml(getResultReviewLabel(match))}</span>`
          : ""}
        ${renderMatchActionButton(match)}
      </span>
    </div>
  `;
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

function isFinishedChallenge(challenge, match) {
  return ["closed", "draw", "cancelled"].includes(challenge.status) || ["finished", "locked"].includes(match?.status);
}

function renderAdminChallengeActions(challenge, opponent, match) {
  if (!isFinishedChallenge(challenge, match)) {
    return '<small class="admin-muted-line">Editable al terminar</small>';
  }

  const canPickOpponent = Boolean(opponent);
  const canResolve = challenge.status !== "cancelled" && challenge.status !== "open";
  const canReopen = ["closed", "draw"].includes(challenge.status);
  const canCancel = challenge.status === "open";

  return `
    <div class="admin-row-actions">
      ${canResolve
        ? `
          <button class="mini-action" type="button" data-admin-challenge-winner="${challenge.id}" data-winner-player="${challenge.creatorPlayerId}">
            Gana creador
          </button>
          <button class="mini-action" type="button" data-admin-challenge-winner="${challenge.id}" data-winner-player="${challenge.opponentPlayerId || ""}" ${canPickOpponent ? "" : "disabled"}>
            Gana rival
          </button>
          <button class="mini-action" type="button" data-admin-challenge-draw="${challenge.id}">
            Empate app
          </button>
        `
        : ""}
      ${canReopen
        ? `
          <button class="mini-action" type="button" data-admin-challenge-reopen="${challenge.id}">
            Reabrir
          </button>
        `
        : ""}
      ${canCancel
        ? `
          <button class="mini-action" type="button" data-admin-challenge-cancel="${challenge.id}">
            Vencer reto
          </button>
        `
        : ""}
      <button class="mini-action danger-action" type="button" data-admin-challenge-delete="${challenge.id}">
        Eliminar
      </button>
    </div>
  `;
}

function getPredictionMatch(prediction, matches) {
  return getMatchById(matches, prediction.matchId);
}

function formatPredictionLine(prediction, matches) {
  const match = getPredictionMatch(prediction, matches);
  const matchName = match ? formatMatchLabel(match) : "Partido no encontrado";

  return `
    <div class="admin-mini-row">
      <span>
        <strong>${escapeHtml(matchName)}</strong>
        <br>${match ? `Partido ${match.matchNumber || "-"}` : ""}
        <small>Guardada: ${escapeHtml(formatPredictionTime(prediction.savedAt))}</small>
      </span>
      <span>${prediction.homeScore} - ${prediction.awayScore}</span>
      <span>${escapeHtml(prediction.homeScorer || "Sin goleadores")} / ${escapeHtml(
        prediction.awayScorer || "Sin goleadores"
      )}</span>
      <span>${prediction.estimatedPoints || 0} pts</span>
    </div>
  `;
}

function formatChallengeLine(challenge, users, matches, selectedUserId) {
  const match = getMatchById(matches, challenge.matchId);
  const creator = getUserById(users, challenge.creatorPlayerId);
  const opponent = getUserById(users, challenge.opponentPlayerId);
  const otherUser =
    challenge.creatorPlayerId === selectedUserId
      ? opponent
      : challenge.opponentPlayerId === selectedUserId
        ? creator
        : null;
  const team =
    challenge.creatorPlayerId === selectedUserId
      ? challenge.creatorTeam
      : challenge.opponentPlayerId === selectedUserId
        ? challenge.opponentTeam
        : "-";

  return `
    <div class="admin-mini-row">
      <span>
        <strong>${escapeHtml(match ? formatMatchLabel(match) : "Partido no encontrado")}</strong>
        <br>${match ? `Partido ${match.matchNumber || "-"}` : ""}
      </span>
      <span>${escapeHtml(team || "-")}</span>
      <span>${escapeHtml(otherUser?.alias || otherUser?.name || "Sin rival")}</span>
      <span>${escapeHtml(getChallengeStatusLabel(challenge.status))}</span>
    </div>
  `;
}

function renderAdminUserDetail(user, predictions, matches, challenges, users) {
  const detail = document.querySelector("#adminUserDetail");

  if (!detail) {
    return;
  }

  if (!user) {
    detail.innerHTML = '<div class="empty-admin">Selecciona un jugador para revisar su actividad.</div>';
    return;
  }

  const userPredictions = predictions.filter((prediction) => prediction.playerId === user.id);
  const userChallenges = challenges.filter(
    (challenge) => challenge.creatorPlayerId === user.id || challenge.opponentPlayerId === user.id
  );
  const isAdmin = user.role === "admin";

  detail.innerHTML = `
    <form class="admin-user-editor" id="adminUserEditForm" data-admin-user-form="${user.id}">
      <div class="admin-user-heading">
        <div>
          <span>${escapeHtml(user.email)}</span>
          <strong>${escapeHtml(user.alias || user.name)}</strong>
        </div>
        <span class="payment-chip ${isAdmin ? "is-success" : ""}">${escapeHtml(user.role || "player")}</span>
      </div>
      <label>
        Nombre
        <input name="name" type="text" value="${escapeHtml(user.name || "")}" required />
      </label>
      <label>
        Alias
        <input name="alias" type="text" value="${escapeHtml(user.alias || "")}" required />
      </label>
      <label>
        WhatsApp
        <input name="phone" type="text" value="${escapeHtml(user.phone || "")}" required />
      </label>
      <label>
        Equipo
        <select name="team">
          ${[...new Set(qualifiedTeams.concat(user.team).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "es"))
            .map(
              (team) => `
                <option value="${escapeHtml(team)}" ${team === user.team ? "selected" : ""}>
                  ${escapeHtml(formatTeamLabel(team))}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
      <label>
        Estado
        <select name="paymentStatus">
          ${["Activo", "Pendiente", "Inactivo"]
            .map(
              (status) => `
                <option value="${status}" ${status === user.paymentStatus ? "selected" : ""}>
                  ${status}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
      <div class="admin-user-actions">
        <button class="mini-action" type="submit">Guardar cambios</button>
        <button class="mini-action" type="button" data-admin-reset-password="${user.id}">
          Restablecer contraseña
        </button>
        <button
          class="mini-action mini-action-danger"
          type="button"
          data-admin-delete-user="${user.id}"
          ${isAdmin ? "disabled" : ""}
        >
          Eliminar jugador
        </button>
      </div>
    </form>
    <div class="admin-user-activity">
      <article>
        <span>Predicciones</span>
        <strong>${userPredictions.length}</strong>
      </article>
      <article>
        <span>Retos</span>
        <strong>${userChallenges.length}</strong>
      </article>
      <article>
        <span>Puntos</span>
        <strong>${user.points || 0}</strong>
      </article>
    </div>
    <div class="admin-mini-table">
      <h4>Predicciones del jugador</h4>
      ${
        userPredictions.length
          ? userPredictions
              .map((prediction) => formatPredictionLine(prediction, matches))
              .join("")
          : '<div class="empty-admin">Este jugador aún no tiene predicciones.</div>'
      }
    </div>
    <div class="admin-mini-table">
      <h4>Retos del jugador</h4>
      ${
        userChallenges.length
          ? userChallenges
              .map((challenge) => formatChallengeLine(challenge, users, matches, user.id))
              .join("")
          : '<div class="empty-admin">Este jugador aún no tiene retos.</div>'
      }
    </div>
  `;
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
          <span><strong>${escapeHtml(participant.name)}</strong><br>${escapeHtml(formatTeamLabel(participant.team))}</span>
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
  const cancelledCount = challenges.filter((challenge) => challenge.status === "cancelled").length;
  const totalStake = activeChallenges.reduce((sum, challenge) => sum + (challenge.stakeAmount || 0) * 2, 0);
  const closedChallenges = activeChallenges.filter((challenge) => ["closed", "draw"].includes(challenge.status));
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
      <span>Cancelados</span>
      <strong>${cancelledCount}</strong>
    </article>
  `;

  if (!challenges.length) {
    table.innerHTML = '<div class="empty-admin">Aún no hay retos creados.</div>';
    return;
  }

  const rows = challenges
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
            <strong>${escapeHtml(match ? formatMatchLabel(match) : "Partido no encontrado")}</strong>
            <br>${match ? `Partido ${match.matchNumber || "-"}` : ""}
          </span>
          <span>${escapeHtml(creator?.alias || creator?.name || "Jugador")}<br>${escapeHtml(formatTeamLabel(challenge.creatorTeam))}</span>
          <span>${escapeHtml(opponent?.alias || opponent?.name || "Sin rival")}<br>${escapeHtml(formatTeamLabel(challenge.opponentTeam || "-"))}</span>
          <span>${formatCurrency(challenge.stakeAmount)}<br>Bolsa ${formatCurrency(total)}</span>
          <span><span class="payment-chip">${escapeHtml(getChallengeStatusLabel(challenge.status))}</span><br>App ${formatCurrency(fee)}<br>Premio ${formatCurrency(payout)}</span>
          <span>${escapeHtml(winner?.alias || winner?.name || (challenge.status === "draw" ? "App" : "-"))}</span>
          <span>${renderAdminChallengeActions(challenge, opponent, match)}</span>
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
      <span>Acciones</span>
    </div>
    ${rows}
  `;
}

function renderAdminTodayMatches(matches, predictions) {
  const container = document.querySelector("#adminTodayMatches");

  if (!container) {
    return;
  }

  if (!matches.length) {
    container.innerHTML = "";
    return;
  }

  const todayKey = getBogotaDateKey(new Date());
  const sortedMatches = sortMatchesByDate(matches);
  const actionableMatches = sortedMatches.filter((match) => match.status !== "finished");
  const pendingToCloseMatches = actionableMatches
    .filter((match) => isLiveMatch(match) || match.status === "locked")
    .slice(0, 8);
  const todayMatches = actionableMatches.filter((match) => getBogotaDateKey(match.date) === todayKey);
  const allTodayMatches = sortedMatches.filter((match) => getBogotaDateKey(match.date) === todayKey);
  const isTodayView = todayMatches.length > 0;
  const quickMatches = isTodayView
    ? todayMatches
    : actionableMatches.filter((match) => new Date(match.date) >= new Date()).slice(0, 5);

  if (!quickMatches.length) {
    container.innerHTML = "";
    return;
  }

  const summarySource = isTodayView ? allTodayMatches : quickMatches;
  const liveCount = summarySource.filter((match) => isLiveMatch(match)).length;
  const openCount = summarySource.filter((match) => match.status === "open" && !isLiveMatch(match)).length;
  const adminOpenCount = summarySource.filter((match) => match.status === "admin_open").length;
  const lockedCount = summarySource.filter((match) => match.status === "locked").length;
  const finishedCount = summarySource.filter((match) => match.status === "finished").length;
  const totalPredictions = summarySource.reduce(
    (sum, match) => sum + getMatchPredictionCount(predictions, match.id),
    0
  );
  const rows = quickMatches
    .map((match) => renderMatchRow(match, getMatchPredictionCount(predictions, match.id)))
    .join("");
  const pendingRows = pendingToCloseMatches
    .map((match) => renderMatchRow(match, getMatchPredictionCount(predictions, match.id)))
    .join("");
  const pendingPanel = pendingToCloseMatches.length
    ? `
      <div class="admin-close-queue">
        <div class="panel-header compact-header">
          <div>
            <span>Resultados pendientes</span>
            <h3>Partidos por cerrar</h3>
          </div>
        </div>
        <div class="admin-table">
          <div class="admin-row match-admin-row header-row">
            <span>Fecha</span>
            <span>Partido</span>
            <span>Grupo</span>
            <span>Actividad</span>
            <span>Estado</span>
          </div>
          ${pendingRows}
        </div>
      </div>
    `
    : "";

  container.innerHTML = `
    ${pendingPanel}
    <div class="panel-header compact-header">
      <div>
        <span>${isTodayView ? "Agenda de hoy" : "Próximos partidos"}</span>
        <h3>${isTodayView ? "Partidos para operar hoy" : "Siguientes partidos por preparar"}</h3>
      </div>
    </div>
    <div class="operation-summary">
      <article>
        <span>${isTodayView ? "Hoy" : "Próximos"}</span>
        <strong>${summarySource.length}</strong>
      </article>
      <article>
        <span>Abiertos</span>
        <strong>${openCount + adminOpenCount}</strong>
      </article>
      <article>
        <span>En vivo</span>
        <strong>${liveCount}</strong>
      </article>
      <article>
        <span>Cerrados</span>
        <strong>${lockedCount}</strong>
      </article>
      <article>
        <span>Finalizados</span>
        <strong>${finishedCount}</strong>
      </article>
      <article>
        <span>Predicciones</span>
        <strong>${totalPredictions}</strong>
      </article>
    </div>
    <div class="admin-table">
      <div class="admin-row match-admin-row header-row">
        <span>Fecha</span>
        <span>Partido</span>
        <span>Grupo</span>
        <span>Actividad</span>
        <span>Estado</span>
      </div>
      ${rows}
    </div>
  `;
}

function renderSelectedMatchDetail(users, predictions, match) {
  const detail = document.querySelector("#adminMatchDetail");

  if (!match) {
    detail.innerHTML = '<div class="empty-admin">Selecciona un partido para ver sus predicciones.</div>';
    return;
  }

  const matchPredictions = predictions.filter((prediction) => prediction.matchId === match.id);
  const missingUsers = getMissingPredictions(users, predictions, match.id);
  const score =
    match.status === "finished"
      ? `${match.homeScore} - ${match.awayScore}`
      : "Sin resultado";
  const scorers = [...(match.homeScorers || []), ...(match.awayScorers || [])].join(", ") || "Sin goleadores";
  const resultSource = getResultSourceLabel(match);
  const reviewStatus = getResultReviewLabel(match);
  const statusView = getMatchStatusView(match);
  const rows = matchPredictions.length
    ? matchPredictions
        .map((prediction) => {
          const user = getUserById(users, prediction.playerId);

          return `
            <div class="admin-prediction-row">
              <span>
                <strong>${escapeHtml(user?.alias || "Jugador")}</strong>
                <small>${escapeHtml(user?.email || "")}</small>
                <small>Guardada: ${escapeHtml(formatPredictionTime(prediction.savedAt))}</small>
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
        <strong>${escapeHtml(formatMatchLabel(match))}</strong>
      </div>
      <div>
        <span>Estado</span>
        <strong><span class="payment-chip match-state-chip ${statusView.className}">${escapeHtml(statusView.label)}</span></strong>
      </div>
      <div>
        <span>Resultado</span>
        <strong>${escapeHtml(score)}</strong>
      </div>
      <div>
        <span>Predicciones</span>
        <strong>${matchPredictions.length}/${users.filter((user) => user.role !== "admin").length}</strong>
      </div>
      <div>
        <span>Goleadores</span>
        <strong>${escapeHtml(scorers)}</strong>
      </div>
      <div>
        <span>Origen</span>
        <strong>
          <span class="payment-chip">${escapeHtml(resultSource)}</span>
          <span class="payment-chip${getResultReviewClass(match)}">${escapeHtml(reviewStatus)}</span>
        </strong>
      </div>
    </div>
    ${match.status === "finished" && reviewStatus !== "Revisado"
      ? `
        <div class="admin-row-actions admin-review-actions">
          <button class="mini-action" type="button" data-review-match="${match.id}">
            Marcar resultado revisado
          </button>
        </div>
      `
      : ""}
    <div class="admin-match-readiness">
      <article>
        <span>Listos</span>
        <strong>${matchPredictions.length}</strong>
      </article>
      <article>
        <span>Faltan</span>
        <strong>${missingUsers.length}</strong>
      </article>
      <div>
        <span>Jugadores pendientes</span>
        <strong>${
          missingUsers.length
            ? missingUsers
                .slice(0, 12)
                .map((user) => escapeHtml(user.alias || user.name))
                .join(", ")
            : "Todos predijeron"
        }${missingUsers.length > 12 ? ` y ${missingUsers.length - 12} más` : ""}</strong>
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

export function renderAdminMatchDetail(users = [], predictions = [], matches = [], selectedMatchId = null) {
  const sortedMatches = sortMatchesByNumber(matches);
  const selectedMatch = sortedMatches.find((match) => match.id === selectedMatchId) || sortedMatches[0] || null;

  renderSelectedMatchDetail(users, predictions, selectedMatch);
}

export function renderAdmin(
  users,
  predictions = [],
  matches = [],
  selectedMatchId = null,
  participants = [],
  challenges = [],
  selectedUserId = null
) {
  const adminUsersTable = document.querySelector("#adminUsersTable");
  const adminMatchesTable = document.querySelector("#adminMatchesTable");
  const resultMatchSelect = document.querySelector("#resultMatchSelect");
  const adminUserSearch = document.querySelector("#adminUserSearch");
  const adminUserTeamFilter = document.querySelector("#adminUserTeamFilter");
  const adminMatchSearch = document.querySelector("#adminMatchSearch");
  const adminMatchStatusFilter = document.querySelector("#adminMatchStatusFilter");
  const average = users.length ? (predictions.length / users.length).toFixed(1) : "0";
  const sortedMatches = sortMatchesByNumber(matches);
  const userSearchTerm = normalizeText(adminUserSearch?.value);
  const selectedTeamFilter = adminUserTeamFilter?.value || "";
  const matchSearchTerm = normalizeText(adminMatchSearch?.value);
  const selectedMatchStatus = adminMatchStatusFilter?.value || "";
  const selectedMatch = sortedMatches.find((match) => match.id === selectedMatchId) || sortedMatches[0] || null;
  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const filteredUsers = users.filter((user) => {
    const searchSource = normalizeText(`${user.alias} ${user.name} ${user.email} ${user.phone} ${user.team}`);
    const matchesSearch = !userSearchTerm || searchSource.includes(userSearchTerm);
    const matchesTeam = !selectedTeamFilter || user.team === selectedTeamFilter;

    return matchesSearch && matchesTeam;
  });
  const filteredMatches = sortedMatches.filter((match) => {
    const matchNumber = String(match.matchNumber || "");
    const searchSource = normalizeText(`${matchNumber} ${match.homeTeam} ${match.awayTeam} ${match.phase}`);
    const matchesSearch = !matchSearchTerm || searchSource.includes(matchSearchTerm);
    const matchesStatus = !selectedMatchStatus || match.status === selectedMatchStatus;

    return matchesSearch && matchesStatus;
  });

  setText("#adminTotalUsers", users.length);
  setText("#adminPendingPayments", users.length);
  setText("#adminTotalPredictions", predictions.length);
  setText("#adminPredictionAverage", average);
  setText("#adminTopTeam", formatTeamLabel(getTopTeam(users)));
  renderDrawParticipants(users, participants);
  renderAdminChallenges(users, matches, challenges);
  renderAdminTodayMatches(matches, predictions);
  renderAdminUserDetail(selectedUser, predictions, matches, challenges, users);

  if (adminUserTeamFilter) {
    const currentTeamValue = adminUserTeamFilter.value;
    const teamOptions = [...new Set(users.map((user) => user.team).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "es")
    );

    adminUserTeamFilter.innerHTML = `
      <option value="">Todos los equipos</option>
      ${teamOptions
        .map(
          (team) => `
            <option value="${escapeHtml(team)}" ${team === currentTeamValue ? "selected" : ""}>
              ${escapeHtml(formatTeamLabel(team))}
            </option>
          `
        )
        .join("")}
    `;
  }

  resultMatchSelect.innerHTML = sortedMatches
    .map(
      (match) => `
        <option value="${match.id}" ${match.id === selectedMatchId ? "selected" : ""}>
          Partido ${match.matchNumber || "-"} · ${escapeHtml(formatMatchLabel(match))}
        </option>
      `
    )
    .join("");

  renderSelectedMatchDetail(users, predictions, selectedMatch);

  if (!users.length) {
    adminUsersTable.innerHTML = '<div class="empty-admin">Aún no hay usuarios registrados.</div>';
    return;
  }

  if (!filteredUsers.length) {
    adminUsersTable.innerHTML = '<div class="empty-admin">No encontramos jugadores con esos filtros.</div>';
  } else {
  const rows = filteredUsers
    .map(
      (user) => `
        <div class="admin-row">
          <span><strong>${escapeHtml(user.alias)}</strong><br>${escapeHtml(user.name)}</span>
          <span>${escapeHtml(user.email)}</span>
          <span>${escapeHtml(user.phone)}</span>
          <span>${escapeHtml(formatTeamLabel(user.team))}</span>
          <span>${user.points || 0} pts<br>${countPredictions(predictions, user.id)} predicciones</span>
          <span>
            <span class="payment-chip">${escapeHtml(user.paymentStatus)}</span><br>${formatDate(user.registeredAt)}
            <br><button class="mini-action" type="button" data-admin-select-user="${user.id}">Ver detalle</button>
          </span>
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
  }

  if (!matches.length) {
    adminMatchesTable.innerHTML = '<div class="empty-admin">Aún no hay partidos cargados.</div>';
    return;
  }

  if (!filteredMatches.length) {
    adminMatchesTable.innerHTML = '<div class="empty-admin">No encontramos partidos con esos filtros.</div>';
    return;
  }

  const matchRows = filteredMatches
    .map((match) => {
      const total = getMatchPredictionCount(predictions, match.id);

      return renderMatchRow(match, total);
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
