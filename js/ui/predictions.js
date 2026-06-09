export function renderPredictionSummary(prediction, match) {
  const summary = document.querySelector("#predictionSummary");

  if (!match) {
    summary.textContent = "Aún no hay partidos cargados para predecir.";
    return;
  }

  if (!prediction) {
    summary.textContent = `Aún no has guardado predicción para ${match.homeTeam} vs ${match.awayTeam}.`;
    return;
  }

  const homeScorer = prediction.homeScorer || "sin goleador";
  const awayScorer = prediction.awayScorer || "sin goleador";
  summary.textContent = `${match.homeTeam} ${prediction.homeScore} - ${prediction.awayScore} ${match.awayTeam}. Goleadores: ${homeScorer} / ${awayScorer}. Puntos estimados: ${prediction.estimatedPoints}.`;
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

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function isLockedMatch(match) {
  return match?.status === "locked";
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
  const statusLabel = isLocked
    ? "Pendiente de clasificación"
    : isClosed
      ? "Cerrado"
      : prediction
        ? "Predicción guardada"
        : "Abierto";
  const predictionCopy = prediction
    ? `${prediction.homeScore} - ${prediction.awayScore} · Local: ${
        prediction.homeScorer || "Sin goleadores"
      } / Visitante: ${prediction.awayScorer || "Sin goleadores"}`
    : "Sin predicción guardada";

  detail.innerHTML = `
    <div class="selected-match-heading">
      <div>
        <span>Partido ${match.matchNumber || "-"}</span>
        <strong>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</strong>
      </div>
      <em class="${isClosed ? "is-closed" : ""} ${isLocked ? "is-locked" : ""}">${statusLabel}</em>
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
    container.innerHTML = `<p class="empty-group">Aún no hay partidos cargados para ${team}. El administrador debe cargar el calendario de ese grupo.</p>`;
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
        const stateLabel = isLocked ? "Bloqueado" : isClosed ? "Cerrado" : prediction ? "Guardada" : "Pendiente";
        const actionLabel = isLocked ? "Ver cruce" : isClosed ? "Ver detalle" : prediction ? "Editar" : "Predecir";

        return `
        <article class="fixture-item">
          <div>
            <span class="fixture-date">${formatMatchDate(match.date)}</span>
            <strong class="fixture-teams">${match.homeTeam} vs ${match.awayTeam}</strong>
          </div>
          <em class="fixture-status">${stateLabel}</em>
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

  datalist.innerHTML = players.map((player) => `<option value="${player}"></option>`).join("");
}

function parseScorerInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeScorerInput(input, scorers) {
  input.value = [...new Set(scorers)].join(", ");
}

function renderPredictionScorerChips(containerId, fieldName, players, selectedScorers, disabled) {
  const container = document.querySelector(`#${containerId}`);

  if (!container) {
    return;
  }

  if (!players.length) {
    container.innerHTML = '<span class="empty-scorers">Sin jugadores cargados</span>';
    return;
  }

  const selected = new Set(selectedScorers);
  container.innerHTML = players
    .map((player) => {
      const isSelected = selected.has(player);

      return `
        <button
          class="scorer-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-prediction-scorer-field="${fieldName}"
          data-prediction-scorer-name="${encodeURIComponent(player)}"
          ${disabled ? "disabled" : ""}
        >
          ${escapeHtml(player)}
        </button>
      `;
    })
    .join("");
}

function bindPredictionScorerChips(form) {
  if (form.dataset.scorerChipsBound === "true") {
    return;
  }

  form.dataset.scorerChipsBound = "true";
  form.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-prediction-scorer-field]");

    if (!chip || chip.disabled) {
      return;
    }

    event.preventDefault();
    const fieldName = chip.dataset.predictionScorerField;
    const scorerName = decodeURIComponent(chip.dataset.predictionScorerName || "");
    const input = form.querySelector(`[name="${fieldName}"]`);
    const selectedScorers = parseScorerInput(input.value);
    const nextScorers = selectedScorers.includes(scorerName)
      ? selectedScorers.filter((name) => name !== scorerName)
      : [...selectedScorers, scorerName];

    writeScorerInput(input, nextScorers);
    chip.classList.toggle("is-selected", nextScorers.includes(scorerName));
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

  document.querySelector("#predictionModule").textContent = `${match.homeTeam} vs ${match.awayTeam}`;
  document.querySelector("#predictionEditingNote").textContent = prediction
    ? `Editando predicción guardada para ${match.homeTeam} vs ${match.awayTeam}.`
    : `Creando predicción para ${match.homeTeam} vs ${match.awayTeam}.`;
  document.querySelector("#homeScoreLabel").textContent = `Goles ${match.homeTeam}`;
  document.querySelector("#awayScoreLabel").textContent = `Goles ${match.awayTeam}`;
  document.querySelector("#homeScorerLabel").textContent = `Goleadores ${match.homeTeam}`;
  document.querySelector("#awayScorerLabel").textContent = `Goleadores ${match.awayTeam}`;
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
    document.querySelector("#predictionSubmitText").textContent = "Cruce pendiente";
    document.querySelector("#predictionEditingNote").textContent =
      "Este cruce se activará cuando se definan los clasificados.";
  }

  if (match.status === "finished") {
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
    document.querySelector("#predictionSubmitText").textContent = "Partido cerrado";
  }
}

function getPredictionForMatch(predictions, playerId, matchId) {
  return predictions.find((item) => item.playerId === playerId && item.matchId === matchId);
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
        match.status !== "finished" &&
        !isLockedMatch(match) &&
        !getPredictionForMatch(predictions, playerId, match.id)
    );
  }

  if (viewMode === "saved") {
    return scopedMatches.filter(
      (match) =>
        match.status !== "finished" &&
        !isLockedMatch(match) &&
        getPredictionForMatch(predictions, playerId, match.id)
    );
  }

  if (viewMode === "closed") {
    return scopedMatches.filter((match) => match.status === "finished");
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
          ? `Aún no hay partidos cargados para ${context.favoriteTeam || "tu selección"}.`
          : "Aún no hay partidos cargados para este filtro.",
    };
    const message = messages[context.viewMode] || "Aún no hay partidos cargados para este filtro.";
    container.innerHTML = `<p class="empty-group">${message}</p>`;
    return;
  }

  container.innerHTML = matches
    .map((match) => {
      const prediction = getPredictionForMatch(predictions, playerId, match.id);
      const isClosed = match.status === "finished";
      const isLocked = isLockedMatch(match);
      const status = isLocked ? "Bloqueado" : isClosed ? "Cerrado" : prediction ? "Editar" : "Predecir";
      const selectedClass = match.id === selectedMatchId ? " is-selected" : "";
      const savedClass = prediction ? " is-saved" : "";
      const closedClass = isClosed ? " is-closed" : "";
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
            <h4>${match.homeTeam} vs ${match.awayTeam}</h4>
            <p>${match.phase} · ${match.status}</p>
            ${predictionDetails}
          </div>
          <button class="btn btn-secondary btn-full" type="button">
            ${status}
          </button>
        </article>
      `;
    })
    .join("");
}
