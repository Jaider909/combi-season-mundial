import { assignedParticipants } from "./config/assigned-participants.js";
import { qualifiedTeams } from "./config/teams.js";
import {
  getPlayersForTeam,
  listPlayersByTeam,
  listTeamPlayersForAdmin,
  saveTeamPlayer,
  updateTeamPlayer,
} from "./services/team-player-repository.js?v=admin-manager";
import { findGroupByTeam, worldCupGroups } from "./config/groups.js";
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
} from "./services/match-repository.js?v=admin-session-guard";
import { buildKnockoutUpdates } from "./services/knockout-service.js";
import {
  countPredictionsForPlayer,
  deletePrediction,
  getLocalPredictionForUser,
  savePrediction,
  listPredictions,
  updatePredictionPoints,
} from "./services/prediction-repository.js?v=delete-prediction";
import {
  clearChallenges,
  listChallenges,
  saveChallenge,
  settleChallengesForMatch,
  updateChallenge,
} from "./services/challenge-repository.js?v=challenge-finance-polish";
import { calculatePredictionPoints, sumPlayerPoints } from "./services/scoring-service.js?v=multi-scorers";
import {
  clearCurrentUser,
  activateUserSession,
  findUserByEmail,
  getCurrentUser,
  isCloudMode,
  listUsers,
  saveUser,
  updateUserPoints,
} from "./services/user-repository.js?v=admin-rpc-fix";
import { renderAdmin } from "./ui/admin.js?v=challenge-finance-polish";
import { renderDashboard } from "./ui/dashboard.js?v=editable-profile";
import { renderAllGroups, renderUserGroup } from "./ui/groups.js?v=live-standings";
import {
  renderChallengeForm,
  renderChallenges,
  renderChallengeTeamOptions,
} from "./ui/challenges.js?v=challenge-finance-polish";
import { buildActivityFeed, renderActivityFeed } from "./ui/activity-feed.js";
import {
  renderFavoriteTeamMatches,
  getVisiblePredictionMatches,
  renderPredictionControls,
  renderPredictionForm,
  renderPredictionMatchList,
  renderPredictionSummary,
  renderSelectedMatchDetail,
} from "./ui/predictions.js?v=prediction-scorer-chips";
import { renderRanking } from "./ui/ranking.js?v=ranking-polish";
import { renderRoute } from "./ui/router.js?v=admin-public-preview-fix";
import { renderSessionNav } from "./ui/session-nav.js";
import { escapeHtml } from "./ui/dom.js";

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
let selectedMatch = null;
let selectedMatchTeam = null;
let selectedMatchWasManual = false;
let predictionViewMode = "pending";
let predictionScopeMode = "favorite";
let predictionGroupCode = null;
let resultSelectedMatchId = null;
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
  const activeUser = user === undefined ? await getCurrentUser() : await user;
  renderSessionNav(activeUser);
  renderRoute(activeUser);

  try {
    currentMatches = await listMatches();
    currentPredictions = activeUser ? await listPredictions() : [];
    currentChallenges = activeUser ? await listChallenges() : [];
  } catch (error) {
    console.warn("No se pudieron cargar partidos, predicciones o retos.", error);
    currentMatches = [];
    currentPredictions = [];
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
  const prediction =
    activeUser && selectedMatch
      ? currentPredictions.find(
          (item) => item.playerId === activeUser.id && item.matchId === selectedMatch.id
        ) || getLocalPredictionForUser(activeUser.email, selectedMatch.id)
      : null;
  const users = activeUser || getInitialRoute() === "ranking" ? await listUsers() : [];
  const drawParticipants = activeUser?.role === "admin" ? await listAssignedParticipants() : [];
  const userPredictions = activeUser
    ? currentPredictions.filter((item) => item.playerId === activeUser.id)
    : [];
  const favoriteMatchIds = new Set(favoriteMatches.map((match) => match.id));
  const savedFavoritePredictions = userPredictions.filter((item) =>
    favoriteMatchIds.has(item.matchId)
  ).length;
  const closedFavoriteMatches = favoriteMatches.filter((match) => match.status === "finished").length;
  const pendingFavoritePredictions = favoriteMatches.filter(
    (match) =>
      match.status !== "finished" &&
      match.status !== "locked" &&
      !userPredictions.some((predictionItem) => predictionItem.matchId === match.id)
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
  const activityEvents = buildActivityFeed({
    challenges: currentChallenges,
    predictions: currentPredictions,
    matches: currentMatches,
    users,
  });

  renderDashboard(activeUser, stats);
  renderActivityFeed("#dashboardActivityFeed", activityEvents);
  renderActivityFeed("#adminActivityFeed", activityEvents);
  renderSelectedMatchDetail(selectedMatch, prediction);
  renderPredictionForm(
    selectedMatch,
    prediction,
    getPlayersForTeam(playersByTeam, selectedMatch?.homeTeam),
    getPlayersForTeam(playersByTeam, selectedMatch?.awayTeam)
  );
  renderPredictionSummary(prediction, selectedMatch);
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
  renderRanking(users, currentPredictions, activeUser);
  resultSelectedMatchId = resolveResultSelectedMatchId();
  renderAdmin(
    users,
    currentPredictions,
    currentMatches,
    resultSelectedMatchId,
    drawParticipants,
    currentChallenges
  );
  syncResultForm(resultSelectedMatchId);

  if (activeUser?.role === "admin") {
    await refreshAdminTeamPlayers();
  }
}

function renderAdminTeamPlayers() {
  adminPlayerTeam.innerHTML = qualifiedTeams
    .map(
      (team) => `
        <option value="${team}" ${team === adminSelectedPlayerTeam ? "selected" : ""}>
          ${team}
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
            <span><strong>${escapeHtml(player.name)}</strong><br>${escapeHtml(player.team)}</span>
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
    currentTeamPlayers = await listTeamPlayersForAdmin();
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

function syncResultForm(matchId) {
  const match = currentMatches.find((item) => item.id === matchId);

  if (!match) {
    resultForm.reset();
    resultScorers = {
      homeScorers: [],
      awayScorers: [],
    };
    renderScorerChips(null);
    return;
  }

  resultMatchSelect.value = match.id;
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
  const isLocked = match.status === "locked";
  resultForm
    .querySelectorAll('input:not([name="matchId"]), button[type="submit"]')
    .forEach((field) => {
      field.disabled = isLocked;
    });
  resultNote.textContent =
    isLocked
      ? `Cruce bloqueado: ${match.homeTeam} vs ${match.awayTeam}. Se activa cuando se definan clasificados.`
      : match.status === "finished"
      ? `Resultado cargado: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}.`
      : `Partido abierto: ${match.homeTeam} vs ${match.awayTeam}.`;
}

function readSelectedScorers(fieldName) {
  return resultScorers[fieldName] || [];
}

function writeSelectedScorers(fieldName, scorers) {
  resultScorers[fieldName] = [...scorers];
  resultForm.elements[fieldName].value = scorers.join(", ");
}

function renderScorerChipGroup(containerId, fieldName, players, selectedScorers, disabled) {
  const container = document.querySelector(`#${containerId}`);

  if (!container) {
    return;
  }

  if (!players.length) {
    container.innerHTML = '<span class="empty-scorers">Sin jugadores cargados</span>';
    return;
  }

  container.innerHTML = players
    .map((player) => {
      const isSelected = selectedScorers.includes(player);

      return `
        <button
          class="scorer-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-scorer-field="${fieldName}"
          data-scorer-name="${encodeURIComponent(player)}"
          ${disabled ? "disabled" : ""}
        >
          ${escapeHtml(player)}
        </button>
      `;
    })
    .join("");
}

function renderScorerChips(match) {
  if (!match) {
    renderScorerChipGroup("homeScorerChips", "homeScorers", [], [], true);
    renderScorerChipGroup("awayScorerChips", "awayScorers", [], [], true);
    return;
  }

  const disabled = match.status === "locked";
  renderScorerChipGroup(
    "homeScorerChips",
    "homeScorers",
    getPlayersForTeam(currentPlayersByTeam, match.homeTeam),
    readSelectedScorers("homeScorers"),
    disabled
  );
  renderScorerChipGroup(
    "awayScorerChips",
    "awayScorers",
    getPlayersForTeam(currentPlayersByTeam, match.awayTeam),
    readSelectedScorers("awayScorers"),
    disabled
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
    option.textContent = team;
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
      <strong>${escapeHtml(participant.team)} · ${escapeHtml(participant.name)}</strong>
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

  if (lowerMessage.includes("for security purposes") && lowerMessage.includes("seconds")) {
    const seconds = message.match(/after\s+(\d+)\s+seconds/i)?.[1];
    setError(
      seconds
        ? `Supabase está protegiendo el envío de correos. Espera ${seconds} segundos e intenta de nuevo.`
        : "Supabase está protegiendo el envío de correos. Espera un minuto e intenta de nuevo."
    );
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
  const matchPredictions = currentPredictions.filter((prediction) => prediction.matchId === match.id);

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

  const localUser = await getCurrentUser();

  if (localUser?.email?.toLowerCase() === sessionUser.email.toLowerCase()) {
    return localUser;
  }

  return (await findUserByEmail(sessionUser.email)) || (await createPlayerFromAuth(sessionUser));
}

startCountdown("#countdown");
hydrateSession();

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

  if (!match || match.status !== "open") {
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
    "¿Limpiar todos los retos de prueba? Esta accion borra retos abiertos, aceptados y cerrados. No borra usuarios, partidos ni predicciones."
  );

  if (!shouldClear) {
    return;
  }

  try {
    setButtonBusy(clearChallengesButton, true, "Limpiando...");
    await clearChallenges();
    await refreshPanels(await getCurrentUser());
    showNote(resultNote, "Retos limpiados correctamente.", "success");
    notifyApp("Retos limpiados", "El módulo quedó en cero.");
  } catch (error) {
    showError(resultNote, error);
  } finally {
    setButtonBusy(clearChallengesButton, false);
  }
});

adminPlayerTeam.addEventListener("change", (event) => {
  adminSelectedPlayerTeam = event.target.value;
  renderAdminTeamPlayers();
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

syncKnockoutButton.addEventListener("click", async () => {
  try {
    setButtonBusy(syncKnockoutButton, true, "Actualizando...");
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
    setButtonBusy(syncKnockoutButton, false);
  }
});

resultForm.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-scorer-field]");

  if (!chip) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const fieldName = chip.dataset.scorerField;
  const scorerName = decodeURIComponent(chip.dataset.scorerName || "");
  const selectedScorers = readSelectedScorers(fieldName);
  const nextScorers = selectedScorers.includes(scorerName)
    ? selectedScorers.filter((name) => name !== scorerName)
    : [...selectedScorers, scorerName];

  writeSelectedScorers(fieldName, nextScorers);
  renderScorerChips(currentMatches.find((item) => item.id === resultSelectedMatchId));
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

  if (match.status === "locked") {
    showNote(resultNote, "Este cruce está bloqueado hasta definir clasificados.", "warning");
    return;
  }

  try {
    setButtonBusy(resultSubmitButton, true, "Guardando...");
    resultSelectedMatchId = matchId;
    const updatedMatch = {
      ...match,
      homeScore: Number(data.get("homeScore")),
      awayScore: Number(data.get("awayScore")),
      homeScorers: parseScorerList(data.get("homeScorers")),
      awayScorers: parseScorerList(data.get("awayScorers")),
      status: "finished",
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

resultMatchSelect.addEventListener("change", (event) => {
  resultSelectedMatchId = event.target.value;
  syncResultForm(resultSelectedMatchId);
});

document.querySelector("#adminMatchesTable").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-reopen-match]");

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
        status: "open",
      };
      await updateMatchResult(matchId, reopenedMatch);
      const recalculated = await recalculateMatchPoints(reopenedMatch);
      await refreshPanels(await getCurrentUser());
      showNote(resultNote, `Partido reabierto. ${recalculated} predicciones volvieron a 0 puntos.`, "success");
    } catch (error) {
      showError(resultNote, error);
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  const matchRow = event.target.closest("[data-admin-select-match]");

  if (matchRow) {
    resultSelectedMatchId = matchRow.dataset.adminSelectMatch;
    syncResultForm(resultSelectedMatchId);
    resultForm.scrollIntoView({ behavior: "smooth", block: "center" });
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
      "Este cruce todavía está pendiente de clasificación.",
      "warning"
    );
    return;
  }

  const data = new FormData(predictionForm);
  const submittedMatch = selectedMatch;
  const prediction = {
    playerId: user.id,
    email: user.email,
    matchId: selectedMatch.id,
    homeTeam: selectedMatch.homeTeam,
    awayTeam: selectedMatch.awayTeam,
    homeScore: Number(data.get("homeScore")),
    awayScore: Number(data.get("awayScore")),
    homeScorer: normalizeScorerInput(data.get("homeScorer")),
    awayScorer: normalizeScorerInput(data.get("awayScorer")),
    savedAt: new Date().toISOString(),
  };

  try {
    setButtonBusy(predictionSubmitButton, true, "Guardando...");
    prediction.estimatedPoints = estimatePredictionPoints(prediction);
    await savePrediction(prediction);

    if (predictionViewMode === "pending") {
      predictionViewMode = "saved";
    }

    selectedMatch = submittedMatch;
    selectedMatchWasManual = true;
    selectedMatchTeam = user.team;
    await refreshPanels(user);
    const savedPrediction =
      currentPredictions.find(
        (item) => item.playerId === user.id && item.matchId === submittedMatch.id
      ) || prediction;

    if (!selectedMatch || selectedMatch.id !== submittedMatch.id) {
      const playersByTeam = await listPlayersByTeam();
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
    notifyApp("Predicción guardada", `${submittedMatch.homeTeam} vs ${submittedMatch.awayTeam}`);
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

  if (selectedMatch.status === "finished") {
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
    (item) => item.playerId === user.id && item.matchId === selectedMatch.id
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
  predictionForm.scrollIntoView({ behavior: "smooth", block: "center" });
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
  predictionForm.scrollIntoView({ behavior: "smooth", block: "center" });
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
  predictionForm.scrollIntoView({ behavior: "smooth", block: "center" });
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
