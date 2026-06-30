import { assignedParticipants } from "./config/assigned-participants.js?v=cristian-turkey";
import { qualifiedTeams } from "./config/teams.js";
import {
  getPlayersForTeam,
  listPlayersForTeams,
  listPlayersByTeam,
  listTeamPlayersForAdmin,
  saveTeamPlayer,
  updateTeamPlayer,
} from "./services/team-player-repository.js?v=player-numbers";
import { findGroupByTeam, worldCupGroups } from "./config/groups.js";
import { formatTeamLabel, formatMatchLabel } from "./config/team-flags.js?v=team-flags";
import { isAdminEmail } from "./config/admins.js";
import { startCountdown } from "./countdown.js";
import {
  getSessionUser,
  resetPasswordForEmail,
  signInUser,
  signOutUser,
  signUpUser,
  updatePassword,
} from "./services/auth-service.js";
import {
  findParticipantByEmail,
  listAssignedParticipants,
  markParticipantRegistered,
} from "./services/participant-repository.js";
import {
  getMatchesForTeam,
  listMatches,
  updateMatchTeams,
  updateMatchResult,
  updateMatchSchedule,
} from "./services/match-repository.js?v=knockout-advancing-team";
import { buildKnockoutUpdates } from "./services/knockout-service.js?v=knockout-advancing-team";
import {
  countPredictionsForPlayer,
  deletePrediction,
  getLocalPredictionForUser,
  savePrediction,
  listPredictions,
  updatePredictionPoints,
} from "./services/prediction-repository.js?v=prediction-pagination";
import {
  clearChallenges,
  deleteChallenge,
  listChallenges,
  saveChallenge,
  settleChallengesForMatch,
  updateChallenge,
} from "./services/challenge-repository.js?v=admin-challenge-crud";
import { calculatePredictionPoints, sumPlayerPoints } from "./services/scoring-service.js?v=own-goal-scoring";
import {
  clearCurrentUser,
  activateUserSession,
  findUserByEmail,
  getCurrentUser,
  isCloudMode,
  listUsers,
  deleteUser,
  saveUser,
  updateUser,
  updateUserPoints,
} from "./services/user-repository.js?v=admin-user-manager";
import { renderAdmin, renderAdminMatchDetail } from "./ui/admin.js?v=admin-match-detail-sync";
import { renderDashboard } from "./ui/dashboard.js?v=team-flags";
import { renderAllGroups, renderTournamentPath, renderUserGroup } from "./ui/groups.js?v=final-path-groups";
import {
  renderChallengeForm,
  renderChallenges,
  renderChallengeTeamOptions,
} from "./ui/challenges.js?v=prediction-compact-closed";
import { buildActivityFeed, renderActivityFeed } from "./ui/activity-feed.js?v=private-dashboard-feed";
import {
  renderFavoriteTeamMatches,
  getVisiblePredictionMatches,
  isPredictionClosedForPlayer,
  renderPredictionControls,
  renderPredictionForm,
  renderPredictionMatchList,
  renderMatchPredictionsPanel,
  renderPredictionSummary,
  renderSelectedMatchDetail,
} from "./ui/predictions.js?v=collapsible-prediction-rounds";
import { renderRanking } from "./ui/ranking.js?v=ranking-podium";
import { renderRoute } from "./ui/router.js?v=admin-public-preview-fix";
import { renderSessionNav } from "./ui/session-nav.js";
import { escapeHtml } from "./ui/dom.js?v=safe-text";

document.body.dataset.appBoot = "starting";

const form = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const recoveryForm = document.querySelector("#recoveryForm");
const resetPasswordForm = document.querySelector("#resetPasswordForm");
const profileEditForm = document.querySelector("#profileEditForm");
const profilePasswordForm = document.querySelector("#profilePasswordForm");
const predictionForm = document.querySelector("#predictionForm");
const challengeForm = document.querySelector("#challengeForm");
const deletePredictionButton = document.querySelector("#deletePredictionButton");
const resultForm = document.querySelector("#resultForm");
const teamPlayerForm = document.querySelector("#teamPlayerForm");
const syncKnockoutButton = document.querySelector("#syncKnockoutButton");
const clearChallengesButton = document.querySelector("#clearChallengesButton");
const saveMatchScheduleButton = document.querySelector("#saveMatchScheduleButton");
const knockoutDecisionControl = document.querySelector("#knockoutDecisionControl");
const advancingTeamSelect = document.querySelector("#advancingTeamSelect");
const predictionSubmitButton = predictionForm.querySelector('button[type="submit"]');
const challengeSubmitButton = challengeForm.querySelector('button[type="submit"]');
const resultSubmitButton = resultForm.querySelector('button[type="submit"]');
const formNote = document.querySelector("#formNote");
const loginNote = document.querySelector("#loginNote");
const recoveryNote = document.querySelector("#recoveryNote");
const resetPasswordNote = document.querySelector("#resetPasswordNote");
const profileEditNote = document.querySelector("#profileEditNote");
const profilePasswordNote = document.querySelector("#profilePasswordNote");
const resultNote = document.querySelector("#resultNote");
const teamPlayerNote = document.querySelector("#teamPlayerNote");
const challengeNote = document.querySelector("#challengeNote");
const toastStack = document.querySelector("#toastStack");
const assignedTeamPreview = document.querySelector("#assignedTeamPreview");
const availableTeamField = document.querySelector("#availableTeamField");
const resultMatchSelect = document.querySelector("#resultMatchSelect");
const adminPlayerTeam = document.querySelector("#adminPlayerTeam");
const adminTeamPlayersTable = document.querySelector("#adminTeamPlayersTable");
const refreshProfilePanel = document.querySelector("#refreshProfilePanel");
const favoriteTeam = document.querySelector("#favoriteTeam");
const refreshAdminPanel = document.querySelector("#refreshAdminPanel");
const logoutButton = document.querySelector("#logoutButton");
let currentMatches = [];
let currentPredictions = [];
let currentChallenges = [];
let currentUsers = [];
let currentDrawParticipants = [];
let selectedMatch = null;
let selectedMatchTeam = null;
let selectedMatchWasManual = false;
let isMatchClockRefreshRunning = false;
let predictionViewMode = "pending";
let predictionScopeMode = "all";
let predictionGroupCode = null;
let resultSelectedMatchId = null;
let adminSelectedUserId = null;
let adminActiveModule = "resumen";
let currentTeamPlayers = [];
let adminSelectedPlayerTeam = "Colombia";
let currentPlayersByTeam = {};
let resultScorers = {
  homeScorers: [],
  awayScorers: [],
};

prepareRecoveryRoute();
renderSessionNav(null);

if (!isProtectedRoute(getInitialRoute())) {
  renderRoute(null);
}

async function hydrateSession() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.email) {
    await clearCurrentUser();
    await refreshPanels(null);
    return;
  }

  const existingPlayer = await findUserByEmail(sessionUser.email);
  const player = existingPlayer
    ? await activateUserSession(existingPlayer)
    : await createPlayerFromAuth(sessionUser);
  await refreshPanels(player);
}

async function refreshPanels(user) {
  let activeUser = user === undefined ? await getCurrentUser() : await user;

  if (isCloudMode()) {
    const sessionUser = await getSessionUser();

    if (sessionUser?.email) {
      const cloudUser = await findUserByEmail(sessionUser.email);

      if (cloudUser) {
        activeUser = cloudUser;
        await activateUserSession(cloudUser);
      }
    } else {
      activeUser = null;
      await clearCurrentUser();
    }
  }

  renderSessionNav(activeUser);
  renderRoute(activeUser);

  try {
    currentMatches = await listMatches();
  } catch (error) {
    console.warn("No se pudieron cargar partidos.", error);
    currentMatches = [];
  }

  try {
    currentPredictions = activeUser ? await listPredictions() : [];
  } catch (error) {
    console.warn("No se pudieron cargar predicciones.", error);
    currentPredictions = [];
  }

  try {
    currentChallenges = activeUser ? await listChallenges() : [];
  } catch (error) {
    console.warn("No se pudieron cargar retos.", error);
    currentChallenges = [];
  }

  const playersByTeam = await listPlayersByTeam();
  currentPlayersByTeam = playersByTeam;
  const favoriteMatches = getMatchesForTeam(currentMatches, activeUser?.team);
  predictionGroupCode = predictionGroupCode || findGroupByTeam(activeUser?.team)?.id || "A";
  const visiblePredictionMatches = getVisiblePredictionMatches(
    currentMatches,
    predictionViewMode,
    predictionGroupCode,
    activeUser?.team,
    currentPredictions,
    activeUser?.id,
    predictionScopeMode
  );
  selectedMatch = resolveSelectedMatch(activeUser, favoriteMatches);
  selectedMatch = resolveVisibleSelectedMatch(visiblePredictionMatches);
  if (selectedMatch) {
    const selectedMatchPlayers = await listPlayersForTeams([
      selectedMatch.homeTeam,
      selectedMatch.awayTeam,
    ]);
    currentPlayersByTeam = { ...playersByTeam, ...selectedMatchPlayers };
  }
  const prediction =
    activeUser && selectedMatch
      ? findCurrentPrediction(activeUser.id, selectedMatch.id) ||
        getLocalPredictionForUser(activeUser.email, selectedMatch.id)
      : null;
  const users = activeUser || getInitialRoute() === "ranking" ? await listUsers() : [];
  currentUsers = users;
  const drawParticipants = activeUser?.role === "admin" ? await listAssignedParticipants() : [];
  currentDrawParticipants = drawParticipants;
  const userPredictions = activeUser
    ? currentPredictions.filter((item) => sameId(item.playerId, activeUser.id))
    : [];
  const favoriteMatchIds = new Set(favoriteMatches.map((match) => match.id));
  const savedFavoritePredictions = userPredictions.filter((item) =>
    favoriteMatchIds.has(item.matchId)
  ).length;
  const closedFavoriteMatches = favoriteMatches.filter((match) => isPredictionClosedForPlayer(match)).length;
  const pendingFavoritePredictions = favoriteMatches.filter(
    (match) =>
      !isPredictionClosedForPlayer(match) &&
      !userPredictions.some((predictionItem) => sameId(predictionItem.matchId, match.id))
  ).length;
  const sortedUsers = [...users].sort((a, b) => {
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }

    return countPredictionsForPlayer(currentPredictions, b.id) - countPredictionsForPlayer(currentPredictions, a.id);
  });
  const position = activeUser
    ? sortedUsers.findIndex((item) => item.id === activeUser.id) + 1
    : 0;
  const nextAction = pendingFavoritePredictions
    ? `${pendingFavoritePredictions} pendientes`
    : savedFavoritePredictions
      ? "Revisar predicciones"
      : "Explorar calendario";
  const stats = {
    points: activeUser ? sumPlayerPoints(currentPredictions, activeUser.id) : 0,
    predictionCount: activeUser ? countPredictionsForPlayer(currentPredictions, activeUser.id) : 0,
    position,
    pendingFavoritePredictions,
    savedFavoritePredictions,
    closedFavoriteMatches,
    nextAction,
  };
  const dashboardActivityEvents = buildActivityFeed({
    challenges: currentChallenges,
    predictions: currentPredictions,
    matches: currentMatches,
    users,
  });
  const adminActivityEvents = buildActivityFeed({
    challenges: currentChallenges,
    predictions: currentPredictions,
    matches: currentMatches,
    users,
    revealPredictionScores: true,
  });

  renderDashboard(activeUser, stats);
  renderActivityFeed("#dashboardActivityFeed", dashboardActivityEvents);
  renderActivityFeed("#adminActivityFeed", adminActivityEvents);
  renderSelectedMatchDetail(selectedMatch, prediction);
  renderPredictionForm(
    selectedMatch,
    prediction,
    getPlayersForTeam(currentPlayersByTeam, selectedMatch?.homeTeam),
    getPlayersForTeam(currentPlayersByTeam, selectedMatch?.awayTeam)
  );
  renderPredictionSummary(prediction, selectedMatch);
  renderMatchPredictionsPanel(selectedMatch, users, currentPredictions, activeUser);
  renderChallengeForm(currentMatches, activeUser);
  renderChallenges(currentChallenges, currentMatches, users, activeUser);
  renderFavoriteTeamMatches(favoriteMatches, activeUser?.team, currentPredictions, activeUser?.id);
  renderPredictionControls(predictionViewMode, predictionGroupCode, predictionScopeMode);
  renderPredictionMatchList(
    visiblePredictionMatches,
    currentPredictions,
    activeUser?.id,
    selectedMatch?.id,
    {
      favoriteTeam: activeUser?.team,
      viewMode: predictionViewMode,
      scopeMode: predictionScopeMode,
    }
  );
  renderUserGroup(findGroupByTeam(activeUser?.team), activeUser?.team, currentMatches);
  renderAllGroups(worldCupGroups, activeUser?.team, currentMatches);
  renderTournamentPath(worldCupGroups, activeUser?.team, currentMatches);
  renderRanking(users, currentPredictions, activeUser);
  resultSelectedMatchId = resolveResultSelectedMatchId();
  renderAdmin(
    users,
    currentPredictions,
    currentMatches,
    resultSelectedMatchId,
    drawParticipants,
    currentChallenges,
    adminSelectedUserId
  );
  syncResultForm(resultSelectedMatchId);

  if (activeUser?.role === "admin") {
    await refreshAdminTeamPlayers();
    setAdminModule(adminActiveModule);
  }
}

function renderAdminViewOnly() {
  resultSelectedMatchId = resolveResultSelectedMatchId();
  renderAdmin(
    currentUsers,
    currentPredictions,
    currentMatches,
    resultSelectedMatchId,
    currentDrawParticipants,
    currentChallenges,
    adminSelectedUserId
  );
  syncResultForm(resultSelectedMatchId);
  setAdminModule(adminActiveModule);
}

function shouldRefreshForMatchClock() {
  const now = Date.now();

  return currentMatches.some((match) => {
    const matchTime = new Date(match.date).getTime();

    return match.status === "open" && Number.isFinite(matchTime) && matchTime <= now && now - matchTime < 70000;
  });
}

async function refreshPanelsOnMatchStart() {
  if (isMatchClockRefreshRunning || !shouldRefreshForMatchClock()) {
    return;
  }

  try {
    isMatchClockRefreshRunning = true;
    const user = await getCurrentUser();

    if (user) {
      await refreshPanels(user);
    }
  } finally {
    isMatchClockRefreshRunning = false;
  }
}

function renderAdminTeamPlayers() {
  adminPlayerTeam.innerHTML = qualifiedTeams
    .map(
      (team) => `
        <option value="${team}" ${team === adminSelectedPlayerTeam ? "selected" : ""}>
          ${formatTeamLabel(team)}
        </option>
      `
    )
    .join("");

  const table = document.querySelector("#adminTeamPlayersTable");
  const players = currentTeamPlayers.filter((player) => player.team === adminSelectedPlayerTeam);

  if (!players.length) {
    table.innerHTML = '<div class="empty-admin">Aún no hay jugadores cargados para esta selección.</div>';
    return;
  }

  table.innerHTML = `
    <div class="admin-row team-player-row header-row">
      <span>#</span>
      <span>Jugador</span>
      <span>Posición</span>
      <span>Club</span>
      <span>Visible</span>
      <span>Destacado</span>
    </div>
    ${players
      .map(
        (player) => `
          <div class="admin-row team-player-row">
            <span>${player.shirtNumber || "-"}</span>
            <span><strong>${escapeHtml(player.name)}</strong><br>${escapeHtml(formatTeamLabel(player.team))}</span>
            <span>${escapeHtml(player.position || "-")}</span>
            <span>${escapeHtml(player.club || "-")}</span>
            <span>
              <button
                class="mini-action ${player.active ? "is-on" : ""}"
                type="button"
                data-toggle-player-active="${player.id}"
              >
                ${player.active ? "Activo" : "Inactivo"}
              </button>
            </span>
            <span>
              <button
                class="mini-action ${player.isFeatured ? "is-on" : ""}"
                type="button"
                data-toggle-player-featured="${player.id}"
              >
                ${player.isFeatured ? "Destacado" : "Normal"}
              </button>
            </span>
          </div>
        `
      )
      .join("")}
  `;
}

async function refreshAdminTeamPlayers() {
  try {
    currentTeamPlayers = await listTeamPlayersForAdmin(adminSelectedPlayerTeam);
    renderAdminTeamPlayers();
  } catch (error) {
    showError(teamPlayerNote, error);
  }
}

function resolveResultSelectedMatchId() {
  const selectedExists = currentMatches.some((match) => match.id === resultSelectedMatchId);

  if (selectedExists) {
    return resultSelectedMatchId;
  }

  return currentMatches[0]?.id || null;
}

function toDatetimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function isKnockoutMatch(match) {
  return Number(match?.matchNumber) >= 73;
}

function getScoreWinner(match, homeScore, awayScore) {
  if (homeScore > awayScore) return match.homeTeam;
  if (awayScore > homeScore) return match.awayTeam;
  return "";
}

function syncKnockoutDecisionControl(match) {
  if (!knockoutDecisionControl || !advancingTeamSelect) {
    return;
  }

  if (!isKnockoutMatch(match)) {
    knockoutDecisionControl.classList.add("is-hidden");
    advancingTeamSelect.innerHTML = "";
    return;
  }

  knockoutDecisionControl.classList.remove("is-hidden");
  advancingTeamSelect.innerHTML = `
    <option value="">Automático por marcador</option>
    <option value="${escapeHtml(match.homeTeam)}">${formatTeamLabel(match.homeTeam)}</option>
    <option value="${escapeHtml(match.awayTeam)}">${formatTeamLabel(match.awayTeam)}</option>
  `;
  advancingTeamSelect.value = match.advancingTeam || "";
  resultForm.elements.decisionMethod.value = match.decisionMethod || "90_minutos";
}

function syncResultForm(matchId) {
  const match = currentMatches.find((item) => item.id === matchId);
  renderAdminMatchDetail(currentUsers, currentPredictions, currentMatches, matchId);

  if (!match) {
    resultForm.reset();
    resultScorers = {
      homeScorers: [],
      awayScorers: [],
    };
    renderScorerChips(null);
    syncKnockoutDecisionControl(null);
    return;
  }

  resultMatchSelect.value = match.id;
  resultForm.elements.matchDate.value = toDatetimeLocalValue(match.date);
  resultForm.elements.homeScore.value = Number.isFinite(Number(match.homeScore))
    ? Number(match.homeScore)
    : 0;
  resultForm.elements.awayScore.value = Number.isFinite(Number(match.awayScore))
    ? Number(match.awayScore)
    : 0;
  resultScorers = {
    homeScorers: match.status === "finished" ? [...(match.homeScorers || [])] : [],
    awayScorers: match.status === "finished" ? [...(match.awayScorers || [])] : [],
  };
  writeSelectedScorers("homeScorers", resultScorers.homeScorers);
  writeSelectedScorers("awayScorers", resultScorers.awayScorers);
  renderScorerChips(match);
  syncKnockoutDecisionControl(match);
  const isLocked = match.status === "locked";
  resultNote.textContent =
    isLocked
      ? `Predicciones cerradas: ${formatMatchLabel(match)}. Como admin puedes guardar o corregir resultado sin reabrir predicciones.`
      : match.status === "finished"
      ? `Resultado cargado: ${formatTeamLabel(match.homeTeam)} ${match.homeScore} - ${match.awayScore} ${formatTeamLabel(match.awayTeam)}.`
      : `Partido abierto: ${formatMatchLabel(match)}.`;
}

function readSelectedScorers(fieldName) {
  return resultScorers[fieldName] || [];
}

function writeSelectedScorers(fieldName, scorers) {
  resultScorers[fieldName] = [...scorers];
  resultForm.elements[fieldName].value = scorers.join(", ");
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

function getRenderedResultScorerOptions(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} [data-scorer-name]`))
    .map((item) => ({
      name: decodeURIComponent(item.dataset.scorerName || ""),
      shirtNumber: item.dataset.scorerNumber ? Number(item.dataset.scorerNumber) : null,
    }))
    .filter((item) => item.name && item.name !== "Autogol");
}

function renderScorerChipGroup(containerId, fieldName, players, selectedScorers, disabled) {
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
    ? `<button class="scorer-chip scorer-chip-clear" type="button" data-clear-scorer-field="${fieldName}" ${disabled ? "disabled" : ""}>Limpiar</button>`
    : "";

  container.innerHTML = `${clearButton}${options
    .map((player) => {
      const count = countScorerSelections(selectedScorers, player.name);
      const isSelected = count > 0;

      return `
        <button
          class="scorer-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-scorer-field="${fieldName}"
          data-scorer-name="${encodeURIComponent(player.name)}"
          ${player.shirtNumber ? `data-scorer-number="${player.shirtNumber}"` : ""}
          ${disabled ? "disabled" : ""}
        >
          ${escapeHtml(player.label)}${count > 1 ? ` <span>x${count}</span>` : ""}
        </button>
      `;
    })
    .join("")}`;
}

function renderScorerChips(match) {
  if (!match) {
    renderScorerChipGroup("homeScorerChips", "homeScorers", [], [], true);
    renderScorerChipGroup("awayScorerChips", "awayScorers", [], [], true);
    return;
  }

  renderScorerChipGroup(
    "homeScorerChips",
    "homeScorers",
    getPlayersForTeam(currentPlayersByTeam, match.homeTeam),
    readSelectedScorers("homeScorers"),
    false
  );
  renderScorerChipGroup(
    "awayScorerChips",
    "awayScorers",
    getPlayersForTeam(currentPlayersByTeam, match.awayTeam),
    readSelectedScorers("awayScorers"),
    false
  );
}

function parseScorerList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeScorerInput(value) {
  return parseScorerList(value).join(", ");
}

function sameId(left, right) {
  return String(left || "") === String(right || "");
}

function findCurrentPrediction(playerId, matchId) {
  return (
    currentPredictions.find(
      (item) => sameId(item.playerId, playerId) && sameId(item.matchId, matchId)
    ) || null
  );
}

function upsertCurrentPrediction(prediction) {
  if (!prediction?.playerId || !prediction?.matchId) {
    return;
  }

  const existingIndex = currentPredictions.findIndex(
    (item) => sameId(item.playerId, prediction.playerId) && sameId(item.matchId, prediction.matchId)
  );

  if (existingIndex >= 0) {
    currentPredictions[existingIndex] = {
      ...currentPredictions[existingIndex],
      ...prediction,
    };
  } else {
    currentPredictions.unshift(prediction);
  }
}

function getFormValue(form, fieldName, fallback = "") {
  const field = form?.elements?.[fieldName];

  if (field && "value" in field) {
    return field.value ?? fallback;
  }

  const value = new FormData(form).get(fieldName);
  return value ?? fallback;
}

function getFormNumber(form, fieldName, fallback = 0) {
  const value = Number(getFormValue(form, fieldName, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function scrollToPredictionEditor() {
  const target = document.querySelector("#predictionEditor") || predictionForm;
  const getOffsetTop = () => {
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    return Math.max(target.getBoundingClientRect().top + window.scrollY - headerHeight - 18, 0);
  };

  predictionForm.classList.add("is-focused");
  window.scrollTo({ top: getOffsetTop(), behavior: "smooth" });
  window.setTimeout(() => predictionForm.classList.remove("is-focused"), 1400);
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: getOffsetTop(), behavior: "smooth" });
  });
  window.setTimeout(() => window.scrollTo({ top: getOffsetTop(), behavior: "smooth" }), 180);
}

function resolveVisibleSelectedMatch(visibleMatches) {
  if (!visibleMatches.length) {
    return null;
  }

  const selectedIsVisible = visibleMatches.some((match) => match.id === selectedMatch?.id);
  return selectedIsVisible ? selectedMatch : visibleMatches[0];
}

function resolveSelectedMatch(user, favoriteMatches) {
  const selectedMatchExists = currentMatches.some((match) => match.id === selectedMatch?.id);
  const shouldPreferFavorite =
    user?.team &&
    user.team !== "Sin equipo definido" &&
    !selectedMatchWasManual &&
    selectedMatchTeam !== user.team &&
    favoriteMatches.length;

  if (shouldPreferFavorite) {
    selectedMatchTeam = user.team;
    return favoriteMatches[0];
  }

  if (selectedMatchExists) {
    return selectedMatch;
  }

  selectedMatchWasManual = false;
  selectedMatchTeam = user?.team || null;
  return favoriteMatches[0] || currentMatches[0] || null;
}

function getReservedTeams(users = []) {
  return new Set([
    ...assignedParticipants.map((participant) => participant.team),
    ...users.map((user) => user.team).filter((team) => team && team !== "Sin equipo definido"),
  ]);
}

async function getAvailableTeams() {
  const users = await listUsers();
  const reservedTeams = getReservedTeams(users);

  return qualifiedTeams.filter((team) => !reservedTeams.has(team));
}

function renderAvailableTeamOptions(teams) {
  if (!favoriteTeam) {
    return;
  }

  favoriteTeam.innerHTML = `<option value="">Selecciona una selección libre</option>`;

  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = formatTeamLabel(team);
    favoriteTeam.append(option);
  });
}

function setAvailableTeamFieldVisible(isVisible) {
  if (!availableTeamField) {
    return;
  }

  availableTeamField.classList.toggle("is-hidden", !isVisible);
}

async function updateAssignedTeamPreview(email) {
  if (!assignedTeamPreview) {
    return;
  }

  const normalizedEmail = email?.toString().trim().toLowerCase();

  if (!normalizedEmail) {
    assignedTeamPreview.innerHTML = `
      <span>Selección asignada</span>
      <strong>Se validará con tu correo del sorteo.</strong>
    `;
    setAvailableTeamFieldVisible(false);
    return;
  }

  const participant = await findParticipantByEmail(normalizedEmail);

  if (participant) {
    assignedTeamPreview.innerHTML = `
      <span>Selección asignada</span>
      <strong>${escapeHtml(formatTeamLabel(participant.team))} · ${escapeHtml(participant.name)}</strong>
    `;
    setAvailableTeamFieldVisible(false);
    return;
  }

  const availableTeams = await getAvailableTeams();
  renderAvailableTeamOptions(availableTeams);
  assignedTeamPreview.innerHTML = `
    <span>Jugador nuevo</span>
    <strong>Puedes escoger una selección disponible.</strong>
  `;
  setAvailableTeamFieldVisible(true);
}

async function buildUserFromForm(data) {
  const email = data.get("email")?.toString().trim().toLowerCase();
  const participant = await findParticipantByEmail(email);
  const selectedTeam = data.get("team")?.toString().trim();

  if (!participant && !selectedTeam) {
    throw new Error("Escoge una selección disponible para completar tu registro.");
  }

  if (!participant) {
    const availableTeams = await getAvailableTeams();

    if (!availableTeams.includes(selectedTeam)) {
      throw new Error("Esa selección ya no está disponible. Elige otra.");
    }
  }

  return {
    name: participant?.name || data.get("name")?.toString().trim(),
    phone: data.get("phone")?.toString().trim(),
    email,
    team: participant?.team || selectedTeam,
    alias: data.get("alias")?.toString().trim(),
    paymentStatus: "Activo",
    role: isAdminEmail(email) ? "admin" : "player",
    registeredAt: new Date().toISOString(),
  };
}

function validatePasswords(data) {
  const password = data.get("password")?.toString();
  const confirmPassword = data.get("confirmPassword")?.toString();

  if (password !== confirmPassword) {
    throw new Error("Las contraseñas no coinciden.");
  }

  return password;
}

function getInitialRoute() {
  return window.location.hash.replace("#", "").split("&")[0].split("#")[0] || "inicio";
}

function isProtectedRoute(route) {
  return ["dashboard", "predicciones", "grupos", "perfil", "admin", "predictionModule"].includes(route);
}

function prepareRecoveryRoute() {
  if (!window.location.hash.includes("type=recovery")) {
    return;
  }

  if (window.location.hash.startsWith("#restablecer&")) {
    return;
  }

  const recoveryHash = window.location.hash.slice(1).replace(/^(login|restablecer)#/, "");
  history.replaceState(null, "", `${window.location.pathname}#restablecer&${recoveryHash}`);
}

function showError(element, error) {
  const message = error?.message || String(error);
  const lowerMessage = message.toLowerCase();
  const setError = (text) => showNote(element, text, "error");

  if (lowerMessage.includes("invalid login credentials")) {
    setError("Email o contraseña incorrectos.");
    return;
  }

  if (lowerMessage.includes("email not confirmed")) {
    setError("Debes confirmar tu correo antes de entrar.");
    return;
  }

  if (lowerMessage.includes("auth session missing")) {
    setError("El enlace expiró. Solicita uno nuevo para recuperar tu contraseña.");
    return;
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    setError("Ese correo ya está registrado. Intenta iniciar sesión.");
    return;
  }

  if (lowerMessage.includes("email rate limit exceeded")) {
    setError("Supabase alcanzó el límite de correos por ahora. Espera unos minutos e intenta de nuevo.");
    return;
  }

  if (
    lowerMessage.includes("predicciones de este partido ya estan cerradas") ||
    lowerMessage.includes("partido cerrado")
  ) {
    setError("Este partido ya empezó o fue cerrado. Ya no permite cambios en predicciones.");
    return;
  }

  if (lowerMessage.includes("no puedes eliminar predicciones")) {
    setError("Este partido ya está cerrado. No puedes eliminar esa predicción.");
    return;
  }

  if (lowerMessage.includes("for security purposes") && lowerMessage.includes("seconds")) {
    const seconds = message.match(/after\s+(\d+)\s+seconds/i)?.[1];
    setError(
      seconds
        ? `Supabase está protegiendo el envío de correos. Espera ${seconds} segundos e intenta de nuevo.`
        : "Supabase está protegiendo el envío de correos. Espera un minuto e intenta de nuevo."
    );
    return;
  }

  if (lowerMessage.includes("tostring") || lowerMessage.includes("undefined is not an object")) {
    setError("La app recibió un dato incompleto. Actualiza la página e intenta de nuevo.");
    return;
  }

  setError(`No se pudo completar: ${message}`);
}

function showNote(element, message, type = "info") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove("is-success", "is-error", "is-warning", "is-info");
  element.classList.add(`is-${type}`);
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch {
    // El navegador puede bloquear audio si no hubo interacción previa.
  }
}

function notifyApp(title, detail = "") {
  if (!toastStack) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `${escapeHtml(title)}${detail ? `<small>${escapeHtml(detail)}</small>` : ""}`;
  toastStack.prepend(toast);
  playNotificationSound();

  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function setButtonBusy(button, isBusy, busyText = "Guardando...") {
  if (!button) {
    return;
  }

  const label = button.querySelector("span:last-child");

  if (isBusy) {
    button.dataset.originalText = label ? label.textContent : button.textContent.trim();
    button.disabled = true;

    if (label) {
      label.textContent = busyText;
    } else {
      button.textContent = busyText;
    }

    return;
  }

  button.disabled = false;

  if (button.dataset.originalText) {
    if (label) {
      label.textContent = button.dataset.originalText;
    } else {
      button.textContent = button.dataset.originalText;
    }

    delete button.dataset.originalText;
  }
}

function setAdminModule(moduleName, shouldScroll = false) {
  const nextModule = moduleName || "resumen";
  adminActiveModule = nextModule;

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    const isActive = button.dataset.adminTab === nextModule;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-admin-module]").forEach((module) => {
    module.classList.toggle("is-active", module.dataset.adminModule === nextModule);
  });

  if (shouldScroll) {
    document.querySelector(".admin-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function togglePasswordVisibility(button) {
  const input = document.querySelector(button.dataset.togglePassword);

  if (!input) {
    return;
  }

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  button.textContent = shouldShow ? "Ocultar" : "Ver";
}

async function handlePasswordChange(formElement, noteElement, successMessage) {
  const data = new FormData(formElement);
  const password = validatePasswords(data);

  await updatePassword(password);
  formElement.reset();
  noteElement.textContent = successMessage;
}

function estimatePredictionPoints(prediction) {
  let points = 0;

  return points;
}

async function recalculateMatchPoints(match) {
  const matchPredictions = currentPredictions.filter((prediction) => sameId(prediction.matchId, match.id));

  for (const prediction of matchPredictions) {
    const points = calculatePredictionPoints(prediction, match);
    await updatePredictionPoints(prediction.id, points);
    prediction.estimatedPoints = points;
  }

  const users = await listUsers();

  for (const user of users) {
    await updateUserPoints(user.id, sumPlayerPoints(currentPredictions, user.id));
  }

  return matchPredictions.length;
}

async function createPlayerFromAuth(authUser) {
  const metadata = authUser?.user_metadata || {};
  const email = authUser?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  const participant = await findParticipantByEmail(email);
  const metadataTeam = metadata.favoriteTeam || "";

  if (!participant) {
    const availableTeams = await getAvailableTeams();

    if (!metadataTeam || !availableTeams.includes(metadataTeam)) {
      throw new Error("Tu selección ya no está disponible. Regístrate de nuevo con una selección libre.");
    }
  }

  const savedUser = await saveUser({
    name: participant?.name || metadata.name || email.split("@")[0],
    phone: metadata.phone || "Pendiente",
    email,
    team: participant?.team || metadataTeam,
    alias: metadata.alias || metadata.name || email.split("@")[0],
    paymentStatus: "Activo",
    role: isAdminEmail(email) ? "admin" : "player",
    authUserId: authUser.id,
    registeredAt: new Date().toISOString(),
  });

  if (participant) {
    await markParticipantRegistered(email, authUser.id);
  }

  return savedUser;
}

async function getActivePlayer() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.email) {
    if (isCloudMode()) {
      await clearCurrentUser();
    }

    return null;
  }

  if (isCloudMode()) {
    const cloudUser =
      (await findUserByEmail(sessionUser.email)) || (await createPlayerFromAuth(sessionUser));
    await activateUserSession(cloudUser);
    return cloudUser;
  }

  return await getCurrentUser();
}

startCountdown("#countdown");
hydrateSession();
window.setInterval(refreshPanelsOnMatchStart, 60 * 1000);

if (isCloudMode()) {
  formNote.textContent = "Modo nube activo: los registros se guardan en Supabase.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);

  try {
    const password = validatePasswords(data);
    const user = await buildUserFromForm(data);
    const authResult = await signUpUser({
      email: user.email,
      password,
      metadata: {
        name: user.name,
        alias: user.alias,
        phone: user.phone,
        favoriteTeam: user.team,
      },
    });
    const savedUser = await saveUser({ ...user, authUserId: authResult.userId });
    await markParticipantRegistered(savedUser.email, authResult.userId);
    await refreshPanels(savedUser);
    formNote.textContent = authResult.needsEmailConfirmation
      ? `${savedUser.name}, revisa tu correo para confirmar la cuenta.`
      : `${savedUser.name}, tu dashboard ya está listo.`;
    form.reset();
    window.location.hash = "dashboard";
    renderRoute(savedUser);
  } catch (error) {
    showError(formNote, error);
  }
});

form.elements.email.addEventListener("blur", async (event) => {
  await updateAssignedTeamPreview(event.target.value);
});

form.elements.email.addEventListener("input", (event) => {
  if (!event.target.value.trim()) {
    updateAssignedTeamPreview("");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const email = data.get("email")?.toString().trim().toLowerCase();
  const password = data.get("password")?.toString();

  showNote(loginNote, "Verificando acceso...", "info");

  if (!email || !password) {
    showNote(loginNote, "Escribe tu email y contraseña para entrar.", "warning");
    return;
  }

  try {
    const authResult = await signInUser({ email, password });
    const existingUser = await findUserByEmail(email);
    const user = existingUser ? await activateUserSession(existingUser) : await createPlayerFromAuth(authResult.user);

    if (!user) {
      loginNote.textContent = "No encontramos un registro con ese email.";
      return;
    }

    await refreshPanels(user);
    loginNote.textContent = "Acceso confirmado.";
    loginForm.reset();
    window.location.hash = "dashboard";
    renderRoute(user);
  } catch (error) {
    showError(loginNote, error);
  }
});

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(recoveryForm);
  const email = data.get("email")?.toString().trim().toLowerCase();

  try {
    await resetPasswordForEmail(email);
    recoveryNote.textContent = "Si el correo existe, recibirás un enlace para recuperar tu contraseña.";
    recoveryForm.reset();
  } catch (error) {
    showError(recoveryNote, error);
  }
});

resetPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await handlePasswordChange(
      resetPasswordForm,
      resetPasswordNote,
      "Contraseña actualizada. Ya puedes entrar a tu dashboard."
    );
    const sessionUser = await getSessionUser();
    const user = sessionUser?.email
      ? (await findUserByEmail(sessionUser.email)) || (await createPlayerFromAuth(sessionUser))
      : null;
    await refreshPanels(user);
    window.location.hash = user ? "dashboard" : "login";
    renderRoute(user);
  } catch (error) {
    showError(resetPasswordNote, error);
  }
});

profileEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = await getActivePlayer();

  if (!user) {
    showNote(profileEditNote, "Tu sesión no está activa. Vuelve a iniciar sesión.", "warning");
    window.location.hash = "login";
    renderRoute(null);
    return;
  }

  const data = new FormData(profileEditForm);
  const updatedUser = {
    ...user,
    name: data.get("name")?.toString().trim(),
    alias: data.get("alias")?.toString().trim(),
    phone: data.get("phone")?.toString().trim(),
  };

  if (!updatedUser.name || !updatedUser.alias || !updatedUser.phone) {
    showNote(profileEditNote, "Completa nombre, alias y WhatsApp.", "warning");
    return;
  }

  try {
    const savedUser = await saveUser(updatedUser);
    showNote(profileEditNote, "Perfil actualizado correctamente.", "success");
    await refreshPanels(savedUser);
  } catch (error) {
    showError(profileEditNote, error);
  }
});

profilePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await handlePasswordChange(
      profilePasswordForm,
      profilePasswordNote,
      "Contraseña actualizada correctamente."
    );
  } catch (error) {
    showError(profilePasswordNote, error);
  }
});

document.querySelector("#challengeMatchSelect").addEventListener("change", async () => {
  renderChallengeTeamOptions(currentMatches, await getCurrentUser());
});

challengeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = await getActivePlayer();

  if (!user) {
    showNote(challengeNote, "Tu sesión no está activa. Vuelve a iniciar sesión.", "warning");
    window.location.hash = "login";
    renderRoute(null);
    return;
  }

  const data = new FormData(challengeForm);
  const match = currentMatches.find((item) => item.id === data.get("matchId")?.toString());
  const creatorTeam = data.get("team")?.toString();
  const stakeAmount = Number(data.get("stakeAmount"));

  if (!match || match.status !== "open" || isPredictionClosedForPlayer(match)) {
    showNote(challengeNote, "Selecciona un partido abierto.", "warning");
    return;
  }

  if (![match.homeTeam, match.awayTeam].includes(creatorTeam)) {
    showNote(challengeNote, "Escoge uno de los equipos del partido.", "warning");
    return;
  }

  try {
    setButtonBusy(challengeSubmitButton, true, "Creando...");
    await saveChallenge({
      matchId: match.id,
      creatorPlayerId: user.id,
      creatorTeam,
      stakeAmount,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    challengeForm.reset();
    await refreshPanels(user);
    showNote(challengeNote, "Reto creado. Queda abierto para que otro jugador lo acepte.", "success");
    notifyApp("Reto creado", `${user.alias} lanzó un nuevo reto.`);
  } catch (error) {
    showError(challengeNote, error);
  } finally {
    setButtonBusy(challengeSubmitButton, false);
  }
});

document.querySelector("#userDashboard").addEventListener("click", async (event) => {
  const acceptButton = event.target.closest("[data-accept-challenge]");
  const cancelButton = event.target.closest("[data-cancel-challenge]");

  if (!acceptButton && !cancelButton) {
    return;
  }

  const user = await getActivePlayer();

  if (!user) {
    showNote(challengeNote, "Tu sesión no está activa. Vuelve a iniciar sesión.", "warning");
    return;
  }

  try {
    const challengeId = acceptButton?.dataset.acceptChallenge || cancelButton?.dataset.cancelChallenge;
    const challenge = currentChallenges.find((item) => item.id === challengeId);

    if (!challenge) {
      showNote(challengeNote, "No encontramos ese reto.", "warning");
      return;
    }

    if (acceptButton) {
      if (challenge.creatorPlayerId === user.id) {
        showNote(challengeNote, "No puedes aceptar tu propio reto.", "warning");
        return;
      }

      const match = currentMatches.find((item) => item.id === challenge.matchId);

      if (!match || challenge.status !== "open" || isPredictionClosedForPlayer(match)) {
        showNote(
          challengeNote,
          "Este reto ya venció porque el partido empezó, se cerró o finalizó.",
          "warning"
        );
        await refreshPanels(user);
        return;
      }

      await updateChallenge(challenge.id, {
        opponentPlayerId: user.id,
        opponentTeam: acceptButton.dataset.opponentTeam,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
      });
      await refreshPanels(user);
      showNote(challengeNote, "Reto aceptado. Queda activo hasta cerrar el resultado.", "success");
      notifyApp("Reto aceptado", `${user.alias} entró al reto.`);
      return;
    }

    if (challenge.creatorPlayerId !== user.id) {
      showNote(challengeNote, "Solo el creador puede cancelar este reto abierto.", "warning");
      return;
    }

    await updateChallenge(challenge.id, {
      status: "cancelled",
      closedAt: new Date().toISOString(),
    });
    await refreshPanels(user);
    showNote(challengeNote, "Reto cancelado. Ya no aparece ni suma en tus retos activos.", "success");
    notifyApp("Reto cancelado", "Se quitó de tus retos activos.");
  } catch (error) {
    showError(challengeNote, error);
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toggle-password]");

  if (button) {
    togglePasswordVisibility(button);
  }
});

refreshProfilePanel.addEventListener("click", async () => {
  const user = await getActivePlayer();

  if (!user) {
    showNote(profileEditNote, "Tu sesión no está activa. Vuelve a iniciar sesión.", "warning");
    window.location.hash = "login";
    renderRoute(null);
    return;
  }

  await refreshPanels(user);
  showNote(profileEditNote, "Perfil actualizado en pantalla.", "success");
  window.location.hash = "perfil";
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOutUser();
    await clearCurrentUser();
    await refreshPanels(null);
    showNote(loginNote, "Sesión cerrada.", "success");
    window.location.hash = "inicio";
    renderRoute(null);
  } catch (error) {
    showError(loginNote, error);
  }
});

refreshAdminPanel.addEventListener("click", async () => {
  try {
    showNote(resultNote, "Panel actualizado.", "success");
    await refreshPanels(await getCurrentUser());
  } catch (error) {
    showError(resultNote, error);
  }
});

clearChallengesButton.addEventListener("click", async () => {
  const shouldClear = window.confirm(
    "¿Limpiar retos cancelados? Esta accion no borra retos abiertos, aceptados, cerrados, usuarios, partidos ni predicciones."
  );

  if (!shouldClear) {
    return;
  }

  try {
    setButtonBusy(clearChallengesButton, true, "Limpiando...");
    await clearChallenges();
    await refreshPanels(await getCurrentUser());
    showNote(resultNote, "Retos cancelados limpiados correctamente.", "success");
    notifyApp("Retos cancelados limpiados", "El historial activo se conserva.");
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(clearChallengesButton, false);
  }
});

document.querySelector("#adminChallengesTable")?.addEventListener("click", async (event) => {
  const winnerButton = event.target.closest("[data-admin-challenge-winner]");
  const drawButton = event.target.closest("[data-admin-challenge-draw]");
  const reopenButton = event.target.closest("[data-admin-challenge-reopen]");
  const cancelButton = event.target.closest("[data-admin-challenge-cancel]");
  const deleteButton = event.target.closest("[data-admin-challenge-delete]");
  const actionButton = winnerButton || drawButton || reopenButton || cancelButton || deleteButton;

  if (!actionButton) {
    return;
  }

  const challengeId =
    winnerButton?.dataset.adminChallengeWinner ||
    drawButton?.dataset.adminChallengeDraw ||
    reopenButton?.dataset.adminChallengeReopen ||
    cancelButton?.dataset.adminChallengeCancel ||
    deleteButton?.dataset.adminChallengeDelete;
  const challenge = currentChallenges.find((item) => item.id === challengeId);

  if (!challenge) {
    showNote(resultNote, "No encontramos ese reto.", "warning");
    return;
  }

  const challengeMatch = currentMatches.find((match) => match.id === challenge.matchId);
  const isEditableChallenge =
    ["closed", "draw", "cancelled"].includes(challenge.status) ||
    ["finished", "locked"].includes(challengeMatch?.status);

  if (!isEditableChallenge) {
    showNote(resultNote, "Solo puedes editar retos terminados desde el admin.", "warning");
    return;
  }

  try {
    setButtonBusy(actionButton, true, "Guardando...");

    if (deleteButton) {
      const shouldDelete = window.confirm(
        "¿Eliminar este reto terminado? Esta acción no borra usuarios, partidos ni predicciones."
      );

      if (!shouldDelete) {
        return;
      }

      await deleteChallenge(challenge.id);
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, "Reto terminado eliminado correctamente.", "success");
      notifyApp("Reto eliminado", "El historial de retos fue actualizado.");
      return;
    }

    if (reopenButton) {
      const shouldReopen = window.confirm(
        "¿Reabrir este reto? Volverá a quedar aceptado para poder recalcularlo cuando guardes el resultado."
      );

      if (!shouldReopen) {
        return;
      }

      await updateChallenge(challenge.id, {
        status: "accepted",
        winnerPlayerId: null,
        closedAt: null,
      });
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, "Reto reabierto para recalcular.", "success");
      return;
    }

    if (cancelButton) {
      await updateChallenge(challenge.id, {
        status: "cancelled",
        closedAt: challenge.closedAt || new Date().toISOString(),
      });
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, "Reto vencido y quitado de los activos.", "success");
      return;
    }

    if (drawButton) {
      await updateChallenge(challenge.id, {
        status: "draw",
        winnerPlayerId: null,
        closedAt: challenge.closedAt || new Date().toISOString(),
      });
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, "Reto marcado como empate para la app.", "success");
      return;
    }

    const winnerPlayerId = winnerButton.dataset.winnerPlayer;

    if (!winnerPlayerId) {
      showNote(resultNote, "Este reto no tiene rival para asignar ganador.", "warning");
      return;
    }

    await updateChallenge(challenge.id, {
      status: "closed",
      winnerPlayerId,
      closedAt: challenge.closedAt || new Date().toISOString(),
    });
    await refreshPanels(await getCurrentUser());
    showNote(resultNote, "Ganador del reto actualizado.", "success");
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(actionButton, false);
  }
});

adminPlayerTeam.addEventListener("change", (event) => {
  adminSelectedPlayerTeam = event.target.value;
  refreshAdminTeamPlayers();
});

teamPlayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(teamPlayerForm);
  const name = data.get("name")?.toString().trim();

  if (!name) {
    showNote(teamPlayerNote, "Escribe el nombre del jugador.", "warning");
    return;
  }

  try {
    await saveTeamPlayer({
      team: adminSelectedPlayerTeam,
      name,
      position: data.get("position")?.toString().trim(),
      shirtNumber: Number(data.get("shirtNumber")) || null,
      club: data.get("club")?.toString().trim(),
      isFeatured: data.get("isFeatured") === "on",
      active: data.get("active") === "on",
    });
    teamPlayerForm.reset();
    teamPlayerForm.elements.isFeatured.checked = true;
    teamPlayerForm.elements.active.checked = true;
    await refreshAdminTeamPlayers();
    showNote(teamPlayerNote, `${name} quedó guardado en ${adminSelectedPlayerTeam}.`, "success");
  } catch (error) {
    showError(teamPlayerNote, error);
  }
});

adminTeamPlayersTable.addEventListener("click", async (event) => {
  const activeButton = event.target.closest("[data-toggle-player-active]");
  const featuredButton = event.target.closest("[data-toggle-player-featured]");
  const playerId = activeButton?.dataset.togglePlayerActive || featuredButton?.dataset.togglePlayerFeatured;

  if (!playerId) {
    return;
  }

  const player = currentTeamPlayers.find((item) => item.id === playerId);

  if (!player) {
    showNote(teamPlayerNote, "No encontramos ese jugador.", "warning");
    return;
  }

  try {
    const button = activeButton || featuredButton;
    button.disabled = true;
    await updateTeamPlayer(player.id, activeButton ? { active: !player.active } : { isFeatured: !player.isFeatured });
    await refreshAdminTeamPlayers();
    showNote(teamPlayerNote, `${player.name} actualizado.`, "success");
  } catch (error) {
    showError(teamPlayerNote, error);
  }
});

async function handleSyncKnockout(button = syncKnockoutButton) {
  try {
    setButtonBusy(button, true, "Actualizando...");
    const updates = buildKnockoutUpdates(currentMatches);

    if (!updates.length) {
      showNote(resultNote, "No hay cruces nuevos para actualizar todavía.", "info");
      return;
    }

    for (const update of updates) {
      await updateMatchTeams(update.id, {
        homeTeam: update.homeTeam,
        awayTeam: update.awayTeam,
        status: update.status,
      });
    }

    await refreshPanels(await getCurrentUser());
    showNote(resultNote, `${updates.length} cruces actualizados.`, "success");
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(button, false);
  }
}

document.querySelectorAll("[data-sync-knockout]").forEach((button) => {
  button.addEventListener("click", () => handleSyncKnockout(button));
});

resultForm.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-scorer-field]");
  const clearButton = event.target.closest("[data-clear-scorer-field]");

  if (!chip && !clearButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (clearButton) {
    const fieldName = clearButton.dataset.clearScorerField;
    const containerId = fieldName === "homeScorers" ? "homeScorerChips" : "awayScorerChips";

    writeSelectedScorers(fieldName, []);
    renderScorerChipGroup(
      containerId,
      fieldName,
      getRenderedResultScorerOptions(containerId),
      [],
      false
    );
    return;
  }

  const fieldName = chip.dataset.scorerField;
  const scorerName = decodeURIComponent(chip.dataset.scorerName || "");
  const selectedScorers = readSelectedScorers(fieldName);
  const nextScorers = selectedScorers.includes(scorerName)
    ? selectedScorers.filter((item) => item !== scorerName)
    : [...selectedScorers, scorerName];

  writeSelectedScorers(fieldName, nextScorers);
  const containerId = fieldName === "homeScorers" ? "homeScorerChips" : "awayScorerChips";
  renderScorerChipGroup(
    containerId,
    fieldName,
    getRenderedResultScorerOptions(containerId),
    nextScorers,
    false
  );
});

resultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(resultForm);
  const matchId = data.get("matchId")?.toString();
  const match = currentMatches.find((item) => item.id === matchId);

  if (!match) {
    showNote(resultNote, "Selecciona un partido válido.", "warning");
    return;
  }

  try {
    setButtonBusy(resultSubmitButton, true, "Guardando...");
    resultSelectedMatchId = matchId;
    const homeScore = Number(data.get("homeScore"));
    const awayScore = Number(data.get("awayScore"));
    const scoreWinner = getScoreWinner(match, homeScore, awayScore);
    const isKnockout = isKnockoutMatch(match);
    const selectedAdvancingTeam = data.get("advancingTeam")?.toString() || "";
    const decisionMethod = data.get("decisionMethod")?.toString() || "90_minutos";

    if (isKnockout && !scoreWinner && !selectedAdvancingTeam) {
      showNote(
        resultNote,
        "Este partido quedó empatado. Elige quién clasifica antes de guardar el resultado.",
        "warning"
      );
      return;
    }

    const updatedMatch = {
      ...match,
      homeScore,
      awayScore,
      homeScorers: parseScorerList(data.get("homeScorers")),
      awayScorers: parseScorerList(data.get("awayScorers")),
      advancingTeam: isKnockout ? selectedAdvancingTeam || scoreWinner : null,
      decisionMethod: isKnockout ? (scoreWinner ? "90_minutos" : decisionMethod) : null,
      status: "finished",
      resultSource: "manual",
      resultReviewStatus: "reviewed",
    };
    await updateMatchResult(matchId, updatedMatch);
    const recalculated = await recalculateMatchPoints(updatedMatch);
    const settledChallenges = await settleChallengesForMatch(updatedMatch, currentChallenges);
    await refreshPanels(await getCurrentUser());
    showNote(
      resultNote,
      `Resultado guardado. ${recalculated} predicciones recalculadas. ${settledChallenges} retos cerrados.`,
      "success"
    );
    notifyApp("Resultado guardado", `${settledChallenges} retos cerrados con este partido.`);
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(resultSubmitButton, false);
  }
});

saveMatchScheduleButton?.addEventListener("click", async () => {
  const data = new FormData(resultForm);
  const matchId = data.get("matchId")?.toString();
  const matchDate = fromDatetimeLocalValue(data.get("matchDate")?.toString());
  const match = currentMatches.find((item) => item.id === matchId);

  if (!match) {
    showNote(resultNote, "Selecciona un partido válido para cambiar el horario.", "warning");
    return;
  }

  if (!matchDate) {
    showNote(resultNote, "Elige una fecha y hora válida.", "warning");
    return;
  }

  try {
    setButtonBusy(saveMatchScheduleButton, true, "Guardando...");
    resultSelectedMatchId = matchId;
    const shouldOpenForPlayers = match.status !== "finished";
    await updateMatchSchedule(matchId, {
      date: matchDate,
      status: shouldOpenForPlayers ? "open" : match.status,
    });
    await refreshPanels(await getCurrentUser());
    const updatedDate = new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(matchDate));
    showNote(
      resultNote,
      `${formatMatchLabel(match)} quedó programado para ${updatedDate}.${
        shouldOpenForPlayers ? " Si estaba cerrado, volvió a quedar abierto para jugadores." : ""
      }`,
      "success"
    );
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(saveMatchScheduleButton, false);
  }
});

resultMatchSelect.addEventListener("change", (event) => {
  resultSelectedMatchId = event.target.value;
  syncResultForm(resultSelectedMatchId);
});

async function handleAdminMatchTableClick(event) {
  const lockButton = event.target.closest("[data-lock-match]");
  const button = event.target.closest("[data-reopen-match]");
  const reviewButton = event.target.closest("[data-review-match]");

  if (reviewButton) {
    const matchId = reviewButton.dataset.reviewMatch;
    const match = currentMatches.find((item) => item.id === matchId);

    if (!match) {
      showNote(resultNote, "No encontramos ese partido para revisar.", "warning");
      return;
    }

    try {
      setButtonBusy(reviewButton, true, "Marcando...");
      resultSelectedMatchId = matchId;
      await updateMatchResult(matchId, {
        ...match,
        status: "finished",
        resultSource: match.resultSource || "manual",
        resultReviewStatus: "reviewed",
      });
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, `Resultado revisado para ${formatMatchLabel(match)}.`, "success");
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(reviewButton, false);
    }
    return;
  }

  if (lockButton) {
    const matchId = lockButton.dataset.lockMatch;
    const match = currentMatches.find((item) => item.id === matchId);

    if (!match) {
      showNote(resultNote, "No encontramos ese partido para cerrar.", "warning");
      return;
    }

    try {
      setButtonBusy(lockButton, true, "Cerrando...");
      resultSelectedMatchId = matchId;
      const lockedMatch = {
        ...match,
        status: "locked",
      };
      await updateMatchResult(matchId, lockedMatch);
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, `Predicciones cerradas para ${formatMatchLabel(match)}.`, "success");
      notifyApp("Predicciones cerradas", formatMatchLabel(match));
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(lockButton, false);
    }
    return;
  }

  if (button) {
    const matchId = button.dataset.reopenMatch;
    const match = currentMatches.find((item) => item.id === matchId);

    if (!match) {
      showNote(resultNote, "No encontramos ese partido para reabrir.", "warning");
      return;
    }

    try {
      setButtonBusy(button, true, "Reabriendo...");
      resultSelectedMatchId = matchId;
      const reopenedMatch = {
        ...match,
        homeScore: null,
        awayScore: null,
        homeScorers: [],
        awayScorers: [],
        status: "admin_open",
      };
      await updateMatchResult(matchId, reopenedMatch);
      const recalculated = await recalculateMatchPoints(reopenedMatch);
      await refreshPanels(await getCurrentUser());
      showNote(
        resultNote,
        `Partido reabierto manualmente para jugadores. ${recalculated} predicciones volvieron a 0 puntos.`,
        "success"
      );
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  const matchRow = event.target.closest("[data-admin-select-match]");

  if (matchRow) {
    setAdminModule("partidos");
    resultSelectedMatchId = matchRow.dataset.adminSelectMatch;
    syncResultForm(resultSelectedMatchId);
    resultForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

document.querySelector("#adminMatchesTable").addEventListener("click", handleAdminMatchTableClick);
document.querySelector("#adminTodayMatches").addEventListener("click", handleAdminMatchTableClick);
document.querySelector("#adminMatchDetail").addEventListener("click", handleAdminMatchTableClick);

document.querySelector(".admin-tabs")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-tab]");

  if (!button) {
    return;
  }

  setAdminModule(button.dataset.adminTab, true);
});

document.querySelector("#adminUserSearch")?.addEventListener("input", renderAdminViewOnly);
document.querySelector("#adminUserTeamFilter")?.addEventListener("change", renderAdminViewOnly);
document.querySelector("#adminMatchSearch")?.addEventListener("input", renderAdminViewOnly);
document.querySelector("#adminMatchStatusFilter")?.addEventListener("change", renderAdminViewOnly);

document.querySelector("#adminUsersTable").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-admin-select-user]");

  if (!button) {
    return;
  }

  setAdminModule("jugadores");
  adminSelectedUserId = button.dataset.adminSelectUser;
  await refreshPanels(await getCurrentUser());
  document.querySelector("#adminUserManager")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#adminUserDetail").addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-admin-user-form]");

  if (!form) {
    return;
  }

  event.preventDefault();

  const userId = form.dataset.adminUserForm;
  const user = currentUsers.find((item) => item.id === userId);

  if (!user) {
    showNote(resultNote, "No encontramos ese jugador para actualizar.", "warning");
    return;
  }

  try {
    const data = new FormData(form);
    const updatedUser = await updateUser(userId, {
      name: data.get("name")?.toString().trim(),
      alias: data.get("alias")?.toString().trim(),
      phone: data.get("phone")?.toString().trim(),
      team: data.get("team")?.toString(),
      paymentStatus: data.get("paymentStatus")?.toString(),
    });
    const active = await getCurrentUser();
    await refreshPanels(active?.id === userId ? updatedUser || active : active);
    showNote(resultNote, `Jugador actualizado: ${updatedUser?.alias || user.alias || user.name}.`, "success");
  } catch (error) {
    showError(resultNote, error);
  }
});

document.querySelector("#adminUserDetail").addEventListener("click", async (event) => {
  const resetButton = event.target.closest("[data-admin-reset-password]");
  const deleteButton = event.target.closest("[data-admin-delete-user]");
  const userId = resetButton?.dataset.adminResetPassword || deleteButton?.dataset.adminDeleteUser;

  if (!userId) {
    return;
  }

  const user = currentUsers.find((item) => item.id === userId);

  if (!user) {
    showNote(resultNote, "No encontramos ese jugador.", "warning");
    return;
  }

  if (resetButton) {
    try {
      setButtonBusy(resetButton, true, "Enviando...");
      await resetPasswordForEmail(user.email);
      showNote(resultNote, `Correo de recuperación enviado a ${user.email}.`, "success");
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(resetButton, false);
    }
    return;
  }

  if (deleteButton) {
    if (user.role === "admin") {
      showNote(resultNote, "Por seguridad no puedes eliminar un administrador desde este panel.", "warning");
      return;
    }

    const userPredictions = currentPredictions.filter((prediction) => sameId(prediction.playerId, user.id)).length;
    const userChallenges = currentChallenges.filter(
      (challenge) => challenge.creatorPlayerId === user.id || challenge.opponentPlayerId === user.id
    ).length;
    const shouldDelete = window.confirm(
      `Eliminar a ${user.alias || user.name}? Se borraran ${userPredictions} predicciones y se afectaran ${userChallenges} retos relacionados.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setButtonBusy(deleteButton, true, "Eliminando...");
      await deleteUser(user.id);
      adminSelectedUserId = null;
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, `Jugador eliminado: ${user.alias || user.name}.`, "success");
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(deleteButton, false);
    }
  }
});

predictionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = await getActivePlayer();

  if (!user) {
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Tu sesión no está activa. Vuelve a iniciar sesión para guardar.",
      "warning"
    );
    window.location.hash = "login";
    renderRoute(null);
    return;
  }

  if (!selectedMatch) {
    renderPredictionSummary(null, selectedMatch);
    return;
  }

  if (selectedMatch.status === "finished") {
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Este partido ya está cerrado y no permite editar predicciones.",
      "warning"
    );
    return;
  }

  if (selectedMatch.status === "locked") {
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Las predicciones de este partido ya fueron cerradas por el administrador.",
      "warning"
    );
    return;
  }

  if (isPredictionClosedForPlayer(selectedMatch)) {
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Este partido ya empezó. Las predicciones se cerraron automáticamente.",
      "warning"
    );
    return;
  }

  const submittedMatch = selectedMatch;
  const prediction = {
    playerId: user.id,
    email: user.email,
    matchId: selectedMatch.id,
    homeTeam: selectedMatch.homeTeam,
    awayTeam: selectedMatch.awayTeam,
    homeScore: getFormNumber(predictionForm, "homeScore"),
    awayScore: getFormNumber(predictionForm, "awayScore"),
    homeScorer: normalizeScorerInput(getFormValue(predictionForm, "homeScorer")),
    awayScorer: normalizeScorerInput(getFormValue(predictionForm, "awayScorer")),
    savedAt: new Date().toISOString(),
  };

  try {
    setButtonBusy(predictionSubmitButton, true, "Guardando...");
    const shouldContinuePendingFlow = predictionViewMode === "pending";
    prediction.estimatedPoints = estimatePredictionPoints(prediction);
    const persistedPrediction = await savePrediction(prediction);

    if (!persistedPrediction?.playerId || !persistedPrediction?.matchId) {
      throw new Error("Supabase no confirmó la predicción guardada.");
    }

    upsertCurrentPrediction(persistedPrediction);

    selectedMatch = submittedMatch;
    selectedMatchWasManual = true;
    selectedMatchTeam = user.team;
    renderSelectedMatchDetail(submittedMatch, persistedPrediction);
    renderPredictionSummary(persistedPrediction, submittedMatch);
    renderPredictionMatchList(
      getVisiblePredictionMatches(
        currentMatches,
        predictionViewMode,
        predictionGroupCode,
        user.team,
        currentPredictions,
        user.id,
        predictionScopeMode
      ),
      currentPredictions,
      user.id,
      submittedMatch.id,
      {
        favoriteTeam: user.team,
        viewMode: predictionViewMode,
        scopeMode: predictionScopeMode,
      }
    );
    await refreshPanels(user);
    const savedPrediction =
      findCurrentPrediction(persistedPrediction.playerId, persistedPrediction.matchId) ||
      persistedPrediction;
    upsertCurrentPrediction(savedPrediction);
    selectedMatch = submittedMatch;
    selectedMatchWasManual = true;
    selectedMatchTeam = user.team;
    renderSelectedMatchDetail(submittedMatch, savedPrediction);

    if (shouldContinuePendingFlow && selectedMatch?.id && selectedMatch.id !== submittedMatch.id) {
      showNote(
        document.querySelector("#predictionEditingNote"),
        "Predicción guardada. Ya te dejamos el siguiente partido pendiente listo.",
        "success"
      );
      notifyApp("Predicción guardada", formatMatchLabel(submittedMatch));
      scrollToPredictionEditor();
      return;
    }

    if (shouldContinuePendingFlow && !selectedMatch) {
      predictionViewMode = "saved";
      selectedMatch = submittedMatch;
      selectedMatchWasManual = true;
      selectedMatchTeam = user.team;
      await refreshPanels(user);
    } else if (!selectedMatch || selectedMatch.id !== submittedMatch.id) {
      const playersByTeam = await listPlayersForTeams([
        submittedMatch.homeTeam,
        submittedMatch.awayTeam,
      ]);
      selectedMatch = submittedMatch;
      renderSelectedMatchDetail(submittedMatch, savedPrediction);
      renderPredictionForm(
        submittedMatch,
        savedPrediction,
        getPlayersForTeam(playersByTeam, submittedMatch.homeTeam),
        getPlayersForTeam(playersByTeam, submittedMatch.awayTeam)
      );
    }

    renderPredictionSummary(
      {
        ...savedPrediction,
        estimatedPoints: savedPrediction.estimatedPoints,
      },
      submittedMatch
    );
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Predicción guardada correctamente.",
      "success"
    );
    notifyApp("Predicción guardada", formatMatchLabel(submittedMatch));
  } catch (error) {
    showError(document.querySelector("#predictionSummary"), error);
  } finally {
    setButtonBusy(predictionSubmitButton, false);
  }
});

deletePredictionButton.addEventListener("click", async () => {
  const user = await getActivePlayer();

  if (!user || !selectedMatch) {
    return;
  }

  if (selectedMatch.status === "finished" || isPredictionClosedForPlayer(selectedMatch)) {
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Este partido ya está cerrado y no permite eliminar predicciones.",
      "warning"
    );
    return;
  }

  const shouldDelete = window.confirm("¿Eliminar esta predicción?");

  if (!shouldDelete) {
    return;
  }

  const prediction = currentPredictions.find(
    (item) => sameId(item.playerId, user.id) && sameId(item.matchId, selectedMatch.id)
  );

  if (!prediction) {
    renderPredictionSummary(null, selectedMatch);
    return;
  }

  try {
    setButtonBusy(deletePredictionButton, true, "Eliminando...");
    await deletePrediction(prediction);
    predictionViewMode = "pending";
    await refreshPanels(user);
    renderPredictionSummary(null, selectedMatch);
    showNote(
      document.querySelector("#predictionEditingNote"),
      "Predicción eliminada. Este partido volvió a pendientes.",
      "success"
    );
  } catch (error) {
    showError(document.querySelector("#predictionSummary"), error);
  } finally {
    setButtonBusy(deletePredictionButton, false);
  }
});

document.querySelector("#predictionMatchesList").addEventListener("click", async (event) => {
  const matchCard = event.target.closest("[data-select-match]");

  if (!matchCard) {
    return;
  }

  selectedMatch = currentMatches.find((match) => match.id === matchCard.dataset.selectMatch);
  selectedMatchWasManual = true;
  selectedMatchTeam = (await getCurrentUser())?.team || null;
  await refreshPanels(await getCurrentUser());
  scrollToPredictionEditor();
});

document.querySelector("#favoriteTeamMatches").addEventListener("click", async (event) => {
  const matchLink = event.target.closest("[data-dashboard-match]");

  if (!matchLink) {
    return;
  }

  const match = currentMatches.find((item) => item.id === matchLink.dataset.dashboardMatch);

  if (!match) {
    return;
  }

  selectedMatch = match;
  selectedMatchWasManual = true;
  selectedMatchTeam = (await getCurrentUser())?.team || null;
  predictionViewMode = "all";
  predictionScopeMode = "favorite";
  window.location.hash = "predicciones";
  await refreshPanels(await getCurrentUser());
  scrollToPredictionEditor();
});

document.querySelector("#predictionMatchesList").addEventListener("keydown", async (event) => {
  if (!["Enter", " "].includes(event.key)) {
    return;
  }

  const matchCard = event.target.closest("[data-select-match]");

  if (!matchCard) {
    return;
  }

  event.preventDefault();
  selectedMatch = currentMatches.find((match) => match.id === matchCard.dataset.selectMatch);
  selectedMatchWasManual = true;
  selectedMatchTeam = (await getCurrentUser())?.team || null;
  await refreshPanels(await getCurrentUser());
  scrollToPredictionEditor();
});

document.querySelector(".prediction-controls").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-prediction-view]");

  if (!button) {
    return;
  }

  predictionViewMode = button.dataset.predictionView;
  selectedMatch = null;
  selectedMatchWasManual = false;
  selectedMatchTeam = null;
  await refreshPanels(await getCurrentUser());
});

document.querySelector("#predictionGroupFilter").addEventListener("change", async (event) => {
  predictionScopeMode = "group";
  predictionGroupCode = event.target.value;
  selectedMatch = null;
  selectedMatchWasManual = false;
  selectedMatchTeam = null;
  await refreshPanels(await getCurrentUser());
});

document.querySelector("#predictionScopeFilter").addEventListener("change", async (event) => {
  predictionScopeMode = event.target.value;
  selectedMatch = null;
  selectedMatchWasManual = false;
  selectedMatchTeam = null;
  await refreshPanels(await getCurrentUser());
});

window.addEventListener("hashchange", async () => {
  renderRoute(await getCurrentUser());
});

document.body.dataset.appBoot = "ready";
