import { setText } from "./dom.js";

export function renderDashboard(user, stats = {}) {
  const dashboardEmpty = document.querySelector("#dashboardEmpty");
  const userDashboard = document.querySelector("#userDashboard");

  if (!user) {
    dashboardEmpty.classList.remove("is-hidden");
    userDashboard.classList.add("is-hidden");
    return;
  }

  dashboardEmpty.classList.add("is-hidden");
  userDashboard.classList.remove("is-hidden");

  setText("#dashboardTitle", `Hola, ${user.name}`);
  setText(
    "#dashboardSubtitle",
    `${user.alias} juega con ${user.team}. Revisa los partidos pendientes y ajusta tus predicciones antes del cierre.`
  );
  setText("#dashboardTeam", user.team);
  setText("#dashboardAlias", user.alias);
  setText("#dashboardName", user.name);
  setText("#dashboardPhone", user.phone);
  setText("#dashboardEmail", user.email);
  setText("#dashboardPoints", stats.points ?? user.points ?? 0);
  setText("#dashboardPredictions", `${stats.predictionCount ?? 0}/104`);
  setText("#dashboardPosition", stats.position ? `#${stats.position}` : "Nuevo");
  setText("#dashboardPendingPredictions", stats.pendingFavoritePredictions ?? 0);
  setText("#dashboardSavedPredictions", stats.savedFavoritePredictions ?? 0);
  setText("#dashboardClosedMatches", stats.closedFavoriteMatches ?? 0);
  setText("#dashboardNextAction", stats.nextAction || "Crear predicciones");

  const profileEditForm = document.querySelector("#profileEditForm");

  if (profileEditForm) {
    profileEditForm.elements.name.value = user.name || "";
    profileEditForm.elements.alias.value = user.alias || "";
    profileEditForm.elements.phone.value = user.phone || "";
  }
}
