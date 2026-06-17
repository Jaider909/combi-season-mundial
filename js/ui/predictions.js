import { formatMatchLabel, formatTeamLabel } from "../config/team-flags.js?v=team-flags";
import {
  getMatchStatusView,
  hasMatchStarted,
  isLiveMatch,
  isLockedMatch,
  isPredictionClosedForPlayer,
} from "./match-status.js?v=admin-open";

export { isPredictionClosedForPlayer };

export function renderPredictionSummary(prediction, match) {
  const summary = document.querySelector("#predictionSummary");

  if (!match) {
    summary.textContent = "Aún no hay partidos cargados para predecir.";
    return;
  }

  if (!prediction) {
    summary.textContent = `Aún no has guardado predicción para ${formatMatchLabel(match)}.`;
    return;
  }

  const homeScorer = prediction.homeScorer || "sin goleador";
  const awayScorer = prediction.awayScorer || "sin goleador";
  summary.textContent = `${formatTeamLabel(match.homeTeam)} ${prediction.homeScore} - ${prediction.awayScore} ${formatTeamLabel(match.awayTeam)}. Goleadores: ${homeScorer} / ${awayScorer}. Puntos estimados: ${prediction.estimatedPoints}.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMatchDate(date) {
  if (!date) {
    return "Fecha por definir";
  }

  const matchDate = new Date(date);
  const dateOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  const localDate = new Intl.DateTimeFormat("es-CO", dateOptions).format(matchDate);
  const colombiaDate = new Intl.DateTimeFormat("es-CO", {
    ...dateOptions,
    timeZone: "America/Bogota",
  }).format(matchDate);

  if (localDate === colombiaDate) {
    return `${localDate} · hora Colombia`;
  }

  return `${localDate} · tu hora / COL ${colombiaDate}`;
}

function formatPredictionTime(value) {
  if (!value) {
    return "Sin fecha registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha registrada";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPredictionAuditTime(prediction) {
  return prediction?.updatedAt || prediction?.savedAt || prediction?.createdAt || null;
}

function wasPredictionBeforeClose(prediction, match) {
  const auditTime = getPredictionAuditTime(prediction);

  if (!auditTime || !match?.date) {
    return null;
  }

  const savedTime = new Date(auditTime).getTime();
  const closeTime = new Date(match.date).getTime();

  if (Number.isNaN(savedTime) || Number.isNaN(closeTime)) {
    return null;
  }

  return savedTime <= closeTime;
}

function getPredictionTimingView(prediction, match) {
  const wasBeforeClose = wasPredictionBeforeClose(prediction, match);

  if (wasBeforeClose === null) {
    return {
      className: "is-unknown",
      label: "Hora sin validar",
    };
  }

  if (wasBeforeClose) {
    return {
      className: "is-valid",
      label: "Antes del partido",
    };
  }

  return {
    className: "is-warning",
    label: "Después del inicio",
  };
}

function getPredictionForPlayer(predictions, playerId, matchId) {
  return predictions.find((item) => item.playerId === playerId && item.matchId === matchId);
}

function getPlayerLabel(user) {
  return user?.alias || user?.name || "Jugador";
}

function getWinnerSide(homeScore, awayScore) {
  const home = Number(homeScore);
  const away = Number(awayScore);

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  if (home === away) {
    return "draw";
  }

  return home > away ? "home" : "away";
}

function getScorerNames(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeScorer(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function countMatchingScorers(realScorers = [], predictedScorers) {
  const realSet = new Set(
    realScorers
      .map(normalizeScorer)
      .filter((item) => item && item !== "autogol")
  );
  const predictedSet = new Set(
    getScorerNames(predictedScorers)
      .map(normalizeScorer)
      .filter((item) => item && item !== "autogol")
  );

  return [...predictedSet].filter((item) => realSet.has(item)).length;
}

function getPredictionExplanation(prediction, match) {
  if (!prediction || match?.status !== "finished") {
    return "-";
  }

  const reasons = [];
  const exactScore =
    Number(prediction.homeScore) === Number(match.homeScore) &&
    Number(prediction.awayScore) === Number(match.awayScore);
  const winnerMatches =
    getWinnerSide(prediction.homeScore, prediction.awayScore) ===
    getWinnerSide(match.homeScore, match.awayScore);
  const scorerMatches =
    countMatchingScorers(match.homeScorers, prediction.homeScorer) +
    countMatchingScorers(match.awayScorers, prediction.awayScorer);

  if (exactScore) {
    reasons.push("Marcador exacto");
  }

  if (winnerMatches) {
    reasons.push("Ganador acertado");
  }

  if (scorerMatches > 0) {
    reasons.push(`Goleador acertado x${scorerMatches}`);
  }

  return reasons.length ? reasons.join(" · ") : "Sin puntos";
}

function renderPredictionAuditRow(user, prediction, match, shouldReveal, isFinal, isCurrentUser) {
  const statusLabel = prediction ? "Guardada" : "Pendiente";
  const statusClass = prediction ? "is-saved" : "is-pending";
  const timingView = prediction ? getPredictionTimingView(prediction, match) : null;
  const score = shouldReveal && prediction
    ? `${prediction.homeScore} - ${prediction.awayScore}`
    : prediction
      ? "Oculto hasta el inicio"
      : "-";
  const scorers = shouldReveal && prediction
    ? `${prediction.homeScorer || "Sin goleadores"} / ${prediction.awayScorer || "Sin goleadores"}`
    : prediction
      ? "Se revela al iniciar"
      : "-";
  const points = match?.status === "finished" && prediction
    ? `${prediction.estimatedPoints || 0} pts`
    : prediction
      ? "Pendiente"
      : "-";
  const explanation = isFinal && prediction ? getPredictionExplanation(prediction, match) : "-";

  return `
    <div class="match-prediction-row ${prediction ? "has-prediction" : "is-missing"} ${isCurrentUser ? "is-current-user" : ""}">
      <span>
        <strong>${escapeHtml(getPlayerLabel(user))}${isCurrentUser ? '<em class="current-player-badge">Tú</em>' : ""}</strong>
        <small>${escapeHtml(formatTeamLabel(user?.team || "Sin equipo definido"))}</small>
      </span>
      <span><em class="prediction-state-chip ${statusClass}">${statusLabel}</em></span>
      <span>${escapeHtml(score)}</span>
      <span>${escapeHtml(scorers)}</span>
      <span class="prediction-time-cell">${
        prediction
          ? `<strong>${escapeHtml(formatPredictionTime(getPredictionAuditTime(prediction)))}</strong><small class="prediction-time-chip ${timingView.className}">${escapeHtml(timingView.label)}</small>`
          : "-"
      }</span>
      <span class="prediction-points-reason">${escapeHtml(explanation)}</span>
      <strong>${escapeHtml(points)}</strong>
    </div>
  `;
}

export function renderMatchPredictionsPanel(match, users = [], predictions = [], currentUser = null) {
  const panel = document.querySelector("#matchPredictionsPanel");

  if (!panel) {
    return;
  }

  if (!match) {
    panel.innerHTML = "";
    return;
  }

  const predictionsAreLocked = isPredictionClosedForPlayer(match);
  const shouldReveal = match.status === "finished" || hasMatchStarted(match);
  const isFinal = match.status === "finished";
  const playerUsers = users
    .filter((user) => user?.id)
    .sort((a, b) => getPlayerLabel(a).localeCompare(getPlayerLabel(b), "es"));
  const savedCount = playerUsers.filter((user) =>
    getPredictionForPlayer(predictions, user.id, match.id)
  ).length;
  const pendingCount = Math.max(playerUsers.length - savedCount, 0);
  const statusCopy = isFinal
    ? "Resumen final con resultado real, puntos y explicación de cada predicción."
    : shouldReveal
      ? "El partido ya inició: las predicciones se revelan con marcador, goleadores y hora de guardado."
      : predictionsAreLocked
        ? "Predicciones cerradas por admin. Se ve quién guardó y quién falta, sin revelar marcador todavía."
        : "Antes del inicio solo se muestra quién ya guardó y quién falta, sin revelar marcador.";
  const resultSummary = isFinal
    ? `<div class="match-real-result">Resultado real: <strong>${escapeHtml(formatTeamLabel(match.homeTeam))} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${escapeHtml(formatTeamLabel(match.awayTeam))}</strong></div>`
    : "";

  panel.innerHTML = `
    <div class="match-predictions-header">
      <div>
        <span>Transparencia del partido</span>
        <h4>Predicciones de jugadores</h4>
        <p>${escapeHtml(statusCopy)}</p>
      </div>
      <div class="match-predictions-counts">
        <span>${playerUsers.length} jugadores</span>
        <span>${savedCount} guardadas</span>
        <span>${pendingCount} pendientes</span>
      </div>
    </div>
    ${resultSummary}
    <div class="match-predictions-table">
      <div class="match-prediction-row header-row">
        <span>Jugador</span>
        <span>Estado</span>
        <span>Marcador</span>
        <span>Goleadores</span>
        <span>Último guardado</span>
        <span>Explicación</span>
        <span>Puntos</span>
      </div>
      ${playerUsers
        .map((user) =>
          renderPredictionAuditRow(
            user,
            getPredictionForPlayer(predictions, user.id, match.id),
            match,
            shouldReveal,
            isFinal,
            currentUser?.id === user.id
          )
        )
        .join("")}
    </div>
  `;
}

export function renderSelectedMatchDetail(match, prediction) {
  const detail = document.querySelector("#selectedMatchDetail");

  if (!match) {
    detail.innerHTML = `
      <div>
        <span>Partido seleccionado</span>
        <strong>Elige un partido de la bandeja</strong>
      </div>
      <p>Cuando selecciones uno, verás aquí la fecha, grupo, estado y tu predicción guardada.</p>
    `;
    return;
  }

  const isClosed = match.status === "finished";
  const isLocked = isLockedMatch(match);
  const isLive = isLiveMatch(match);
  const statusView = getMatchStatusView(match);
  const statusLabel = isLocked
    ? "Cerrado por admin"
    : isClosed
      ? "Finalizado"
      : isLive
        ? "En vivo"
        : prediction
          ? "Predicción guardada"
          : statusView.label;
  const predictionCopy = prediction
    ? `${prediction.homeScore} - ${prediction.awayScore} · Local: ${
        prediction.homeScorer || "Sin goleadores"
      } / Visitante: ${prediction.awayScorer || "Sin goleadores"}`
    : "Sin predicción guardada";

  detail.innerHTML = `
    <div class="selected-match-heading">
      <div>
        <span>Partido ${match.matchNumber || "-"}</span>
        <strong>${escapeHtml(formatMatchLabel(match))}</strong>
      </div>
      <em class="match-state-badge ${statusView.className} ${prediction && !isPredictionClosedForPlayer(match) ? "is-saved" : ""}">${statusLabel}</em>
    </div>
    <div class="selected-match-meta">
      <div>
        <span>Fecha</span>
        <strong>${formatMatchDate(match.date)}</strong>
      </div>
      <div>
        <span>Grupo</span>
        <strong>${escapeHtml(match.phase)}</strong>
      </div>
      <div>
        <span>Tu marcador</span>
        <strong>${escapeHtml(predictionCopy)}</strong>
      </div>
    </div>
  `;
}

export function renderFavoriteTeamMatches(matches, team, predictions = [], playerId = null) {
  const container = document.querySelector("#favoriteTeamMatches");

  if (!team || team === "Sin equipo definido") {
    container.innerHTML = '<p class="empty-group">Selecciona un equipo para ver sus partidos.</p>';
    return;
  }

  if (!matches.length) {
    container.innerHTML = `<p class="empty-group">Aún no hay partidos cargados para ${escapeHtml(formatTeamLabel(team))}. El administrador debe cargar el calendario de ese grupo.</p>`;
    return;
  }

  container.innerHTML = matches
    .slice(0, 4)
    .map(
      (match) => {
        const prediction = predictions.find(
          (item) => item.playerId === playerId && item.matchId === match.id
        );
        const isClosed = match.status === "finished";
        const isLocked = isLockedMatch(match);
        const isLive = isLiveMatch(match);
        const isUnavailable = isLocked || isClosed || isLive;
        const statusView = getMatchStatusView(match);
        const stateLabel = isLocked
          ? "Cerrado"
          : isClosed
            ? "Finalizado"
            : isLive
              ? "En vivo"
              : prediction
                ? "Guardada"
                : statusView.label;
        const actionLabel = isUnavailable ? "Ver detalle" : prediction ? "Editar" : "Predecir";

        return `
        <article class="fixture-item">
          <div>
            <span class="fixture-date">${formatMatchDate(match.date)}</span>
            <strong class="fixture-teams">${escapeHtml(formatMatchLabel(match))}</strong>
          </div>
          <em class="fixture-status ${statusView.className}">${stateLabel}</em>
          <a class="fixture-action" href="#predicciones" data-dashboard-match="${match.id}">${actionLabel}</a>
        </article>
      `;
      }
    )
    .join("");
}

function renderPlayerOptions(listId, players) {
  const datalist = document.querySelector(`#${listId}`);

  if (!datalist) {
    return;
  }

  datalist.innerHTML = players
    .map((player) => `<option value="${escapeHtml(getPlayerName(player))}"></option>`)
    .join("");
}

function parseScorerInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeScorerInput(input, scorers) {
  input.value = scorers.join(", ");
}

function getPlayerName(player) {
  return typeof player === "string" ? player : player?.name || "";
}

function getPlayerNumber(player) {
  return typeof player === "string" ? null : player?.shirtNumber ?? null;
}

function formatScorerOption(player) {
  const name = getPlayerName(player);
  const number = getPlayerNumber(player);

  return {
    name,
    shirtNumber: number,
    label: number ? `#${number} ${name}` : name,
  };
}

function getScorerOptions(players) {
  const options = players
    .map(formatScorerOption)
    .filter((player) => player.name && player.name !== "Autogol");

  return [{ name: "Autogol", shirtNumber: null, label: "Autogol" }, ...options];
}

function countScorerSelections(selectedScorers, player) {
  return selectedScorers.filter((scorer) => scorer === player).length;
}

function getRenderedScorerOptions(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} [data-prediction-scorer-name]`)
  )
    .map((item) => ({
      name: decodeURIComponent(item.dataset.predictionScorerName || ""),
      shirtNumber: item.dataset.predictionScorerNumber
        ? Number(item.dataset.predictionScorerNumber)
        : null,
    }))
    .filter((item) => item.name && item.name !== "Autogol");
}

function renderPredictionScorerChips(containerId, fieldName, players, selectedScorers, disabled) {
  const container = document.querySelector(`#${containerId}`);

  if (!container) {
    return;
  }

  const options = getScorerOptions(players);

  if (!options.length) {
    container.innerHTML = '<span class="empty-scorers">Sin jugadores cargados</span>';
    return;
  }

  const clearButton = selectedScorers.length
    ? `<button class="scorer-chip scorer-chip-clear" type="button" data-clear-prediction-scorer-field="${fieldName}" ${disabled ? "disabled" : ""}>Limpiar</button>`
    : "";

  container.innerHTML = `${clearButton}${options
    .map((player) => {
      const count = countScorerSelections(selectedScorers, player.name);
      const isSelected = count > 0;

      return `
        <button
          class="scorer-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-prediction-scorer-field="${fieldName}"
          data-prediction-scorer-name="${encodeURIComponent(player.name)}"
          ${player.shirtNumber ? `data-prediction-scorer-number="${player.shirtNumber}"` : ""}
          ${disabled ? "disabled" : ""}
        >
          ${escapeHtml(player.label)}${count > 1 ? ` <span>x${count}</span>` : ""}
        </button>
      `;
    })
    .join("")}`;
}

function bindPredictionScorerChips(form) {
  if (form.dataset.scorerChipsBound === "true") {
    return;
  }

  form.dataset.scorerChipsBound = "true";
  form.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-prediction-scorer-field]");

    if (!chip || chip.disabled) {
      const clearButton = event.target.closest("[data-clear-prediction-scorer-field]");

      if (!clearButton || clearButton.disabled) {
        return;
      }

      event.preventDefault();
      const fieldName = clearButton.dataset.clearPredictionScorerField;
      const input = form.querySelector(`[name="${fieldName}"]`);

      if (input) {
        const containerId =
          fieldName === "homeScorer" ? "homePredictionScorerChips" : "awayPredictionScorerChips";
        const players = getRenderedScorerOptions(containerId);

        writeScorerInput(input, []);
        renderPredictionScorerChips(containerId, fieldName, players, [], false);
      }

      return;
    }

    event.preventDefault();
    const fieldName = chip.dataset.predictionScorerField;
    const scorerName = decodeURIComponent(chip.dataset.predictionScorerName || "");
    const input = form.querySelector(`[name="${fieldName}"]`);

    if (!input) {
      return;
    }

    const selectedScorers = parseScorerInput(input.value);
    const nextScorers = selectedScorers.includes(scorerName)
      ? selectedScorers.filter((item) => item !== scorerName)
      : [...selectedScorers, scorerName];

    writeScorerInput(input, nextScorers);
    const containerId = fieldName === "homeScorer" ? "homePredictionScorerChips" : "awayPredictionScorerChips";
    renderPredictionScorerChips(
      containerId,
      fieldName,
      getRenderedScorerOptions(containerId),
      nextScorers,
      false
    );
  });
}

export function renderPredictionForm(match, prediction, homePlayers = [], awayPlayers = []) {
  const form = document.querySelector("#predictionForm");
  const deleteButton = document.querySelector("#deletePredictionButton");
  const homeScoreInput = form.querySelector('[name="homeScore"]');
  const awayScoreInput = form.querySelector('[name="awayScore"]');
  const homeScorerInput = form.querySelector('[name="homeScorer"]');
  const awayScorerInput = form.querySelector('[name="awayScorer"]');
  bindPredictionScorerChips(form);

  if (!match) {
    form.classList.add("is-disabled");
    deleteButton.classList.add("is-hidden");
    deleteButton.disabled = true;
    form.querySelectorAll("input, button").forEach((field) => {
      field.disabled = true;
    });
    renderPredictionScorerChips("homePredictionScorerChips", "homeScorer", [], [], true);
    renderPredictionScorerChips("awayPredictionScorerChips", "awayScorer", [], [], true);
    document.querySelector("#predictionModule").textContent = "Partidos disponibles";
    document.querySelector("#predictionEditingNote").textContent =
      "Selecciona un partido para crear o editar tu predicción.";
    return;
  }

  form.classList.remove("is-disabled");
  form.querySelectorAll("input, button").forEach((field) => {
    field.disabled = false;
  });
  deleteButton.classList.toggle("is-hidden", !prediction);
  deleteButton.disabled = !prediction;

  document.querySelector("#predictionModule").textContent = formatMatchLabel(match);
  document.querySelector("#predictionEditingNote").textContent = prediction
    ? `Editando predicción guardada para ${formatMatchLabel(match)}.`
    : `Creando predicción para ${formatMatchLabel(match)}.`;
  document.querySelector("#homeScoreLabel").textContent = `Goles ${formatTeamLabel(match.homeTeam)}`;
  document.querySelector("#awayScoreLabel").textContent = `Goles ${formatTeamLabel(match.awayTeam)}`;
  document.querySelector("#homeScorerLabel").textContent = `Goleadores ${formatTeamLabel(match.homeTeam)}`;
  document.querySelector("#awayScorerLabel").textContent = `Goleadores ${formatTeamLabel(match.awayTeam)}`;
  homeScorerInput.placeholder = `Ej: jugador 1, jugador 2`;
  awayScorerInput.placeholder = `Ej: jugador 1, jugador 2`;
  renderPlayerOptions("homeScorerOptions", homePlayers);
  renderPlayerOptions("awayScorerOptions", awayPlayers);
  homeScoreInput.value = prediction?.homeScore ?? 0;
  awayScoreInput.value = prediction?.awayScore ?? 0;
  homeScorerInput.value = prediction?.homeScorer ?? "";
  awayScorerInput.value = prediction?.awayScorer ?? "";
  renderPredictionScorerChips(
    "homePredictionScorerChips",
    "homeScorer",
    homePlayers,
    parseScorerInput(homeScorerInput.value),
    false
  );
  renderPredictionScorerChips(
    "awayPredictionScorerChips",
    "awayScorer",
    awayPlayers,
    parseScorerInput(awayScorerInput.value),
    false
  );
  document.querySelector("#predictionSubmitText").textContent = prediction
    ? "Actualizar predicción"
    : "Guardar predicción";

  if (isLockedMatch(match)) {
    form.classList.add("is-disabled");
    deleteButton.classList.add("is-hidden");
    deleteButton.disabled = true;
    form.querySelectorAll("input, button").forEach((field) => {
      field.disabled = true;
    });
    renderPredictionScorerChips(
      "homePredictionScorerChips",
      "homeScorer",
      homePlayers,
      parseScorerInput(homeScorerInput.value),
      true
    );
    renderPredictionScorerChips(
      "awayPredictionScorerChips",
      "awayScorer",
      awayPlayers,
      parseScorerInput(awayScorerInput.value),
      true
    );
    document.querySelector("#predictionSubmitText").textContent = "Predicción cerrada";
    document.querySelector("#predictionEditingNote").textContent =
      "Las predicciones de este partido están cerradas por el administrador.";
  }

  if (match.status === "finished" || isLiveMatch(match)) {
    form.classList.add("is-disabled");
    deleteButton.classList.add("is-hidden");
    deleteButton.disabled = true;
    form.querySelectorAll("input, button").forEach((field) => {
      field.disabled = true;
    });
    renderPredictionScorerChips(
      "homePredictionScorerChips",
      "homeScorer",
      homePlayers,
      parseScorerInput(homeScorerInput.value),
      true
    );
    renderPredictionScorerChips(
      "awayPredictionScorerChips",
      "awayScorer",
      awayPlayers,
      parseScorerInput(awayScorerInput.value),
      true
    );
    document.querySelector("#predictionSubmitText").textContent = match.status === "finished"
      ? "Partido cerrado"
      : "Predicción cerrada";
    document.querySelector("#predictionEditingNote").textContent = match.status === "finished"
      ? "Este partido ya fue finalizado. Puedes ver tu predicción, pero no editarla."
      : "Este partido ya empezó. Las predicciones quedaron cerradas automáticamente.";
  }
}

function getPredictionForMatch(predictions, playerId, matchId) {
  return predictions.find((item) => item.playerId === playerId && item.matchId === matchId);
}

function getMatchNumber(match) {
  const matchNumber = Number(match.matchNumber);

  return Number.isFinite(matchNumber) ? matchNumber : 999;
}

function sortMatchesBySchedule(matches) {
  return [...matches].sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return getMatchNumber(a) - getMatchNumber(b);
  });
}

function getMatchRoundLabel(match) {
  const matchNumber = getMatchNumber(match);

  if (matchNumber >= 1 && matchNumber <= 72) {
    return `Jornada ${Math.ceil(matchNumber / 24)}`;
  }

  return match.phase || "Fase final";
}

function groupMatchesByRound(matches) {
  return sortMatchesBySchedule(matches).reduce((groups, match) => {
    const label = getMatchRoundLabel(match);
    const group = groups.find((item) => item.label === label);

    if (group) {
      group.matches.push(match);
    } else {
      groups.push({ label, matches: [match] });
    }

    return groups;
  }, []);
}

export function renderPredictionControls(viewMode, groupCode, scopeMode = "favorite") {
  document.querySelectorAll("[data-prediction-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.predictionView === viewMode);
  });

  const groupFilter = document.querySelector("#predictionGroupFilter");
  const groupFilterWrapper = document.querySelector(".prediction-group-filter");
  const scopeFilter = document.querySelector("#predictionScopeFilter");
  groupFilter.value = groupCode || "A";
  scopeFilter.value = scopeMode || "favorite";
  groupFilterWrapper.classList.toggle("is-hidden", scopeMode !== "group");
}

export function getVisiblePredictionMatches(
  matches,
  viewMode,
  groupCode,
  favoriteTeam,
  predictions = [],
  playerId = null,
  scopeMode = "favorite"
) {
  let scopedMatches = matches;

  if (scopeMode === "favorite" && favoriteTeam && favoriteTeam !== "Sin equipo definido") {
    scopedMatches = matches.filter(
      (match) => match.homeTeam === favoriteTeam || match.awayTeam === favoriteTeam
    );
  }

  if (scopeMode === "group") {
    scopedMatches = matches.filter(
      (match) => match.groupCode === groupCode || match.phase === `Grupo ${groupCode}`
    );
  }

  if (viewMode === "pending") {
    return scopedMatches.filter(
      (match) =>
        !isPredictionClosedForPlayer(match) &&
        !getPredictionForMatch(predictions, playerId, match.id)
    );
  }

  if (viewMode === "saved") {
    return scopedMatches.filter(
      (match) =>
        !isPredictionClosedForPlayer(match) &&
        getPredictionForMatch(predictions, playerId, match.id)
    );
  }

  if (viewMode === "closed") {
    return scopedMatches.filter((match) => isPredictionClosedForPlayer(match));
  }

  return scopedMatches;
}

export function renderPredictionMatchList(matches, predictions, playerId, selectedMatchId, context = {}) {
  const container = document.querySelector("#predictionMatchesList");

  if (!matches.length) {
    const messages = {
      pending: "No tienes predicciones pendientes en este filtro.",
      saved: "Aún no tienes predicciones guardadas en este filtro.",
      closed: "Todavía no hay partidos cerrados en este filtro.",
      all:
        context.scopeMode === "favorite"
          ? `Aún no hay partidos cargados para ${
              context.favoriteTeam ? formatTeamLabel(context.favoriteTeam) : "tu selección"
            }.`
          : "Aún no hay partidos cargados para este filtro.",
    };
    const message = messages[context.viewMode] || "Aún no hay partidos cargados para este filtro.";
    container.innerHTML = `<p class="empty-group">${message}</p>`;
    return;
  }

  container.innerHTML = groupMatchesByRound(matches)
    .map(
      (group) => `
        <section class="prediction-round">
          <h4>${escapeHtml(group.label)}</h4>
          <div class="prediction-round-list">
            ${group.matches
              .map((match) => renderPredictionMatchCard(match, predictions, playerId, selectedMatchId))
              .join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderPredictionMatchCard(match, predictions, playerId, selectedMatchId) {
  const prediction = getPredictionForMatch(predictions, playerId, match.id);
  const isClosed = match.status === "finished";
  const isLocked = isLockedMatch(match);
  const isLive = isLiveMatch(match);
  const isUnavailable = isLocked || isClosed || isLive;
  const statusView = getMatchStatusView(match);
  const status = isUnavailable ? "Ver detalle" : prediction ? "Editar" : "Predecir";
  const selectedClass = match.id === selectedMatchId ? " is-selected" : "";
  const savedClass = prediction ? " is-saved" : "";
  const closedClass = isClosed || isLive ? " is-closed" : "";
  const lockedClass = isLocked ? " is-locked" : "";
  const predictionDetails = prediction
    ? `
        <div class="saved-prediction">
          <strong>${prediction.homeScore} - ${prediction.awayScore}</strong>
          <span>${prediction.homeScorer || "Sin goleadores"} · ${
            prediction.awayScorer || "Sin goleadores"
          }</span>
        </div>
      `
    : '<div class="prediction-pending">Sin predicción guardada</div>';

  return `
    <article class="prediction-match-card${selectedClass}${savedClass}${closedClass}${lockedClass}" data-select-match="${match.id}" tabindex="0">
      <div class="prediction-match-copy">
        <span>Partido ${match.matchNumber || "-"} · ${formatMatchDate(match.date)}</span>
        <h4>${escapeHtml(formatMatchLabel(match))}</h4>
        <p>${escapeHtml(match.phase)} · <em class="match-state-badge ${statusView.className}">${escapeHtml(statusView.label)}</em></p>
        ${predictionDetails}
      </div>
      <button class="btn btn-secondary btn-full" type="button" data-select-match="${match.id}">
        ${status}
      </button>
    </article>
  `;
}
