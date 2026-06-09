const publicViews = [
  "inicio",
  "como-funciona",
  "premios",
  "ranking",
  "reserva",
  "login",
  "recuperar",
  "restablecer",
];
const playerViews = ["dashboard", "predicciones", "retos", "grupos", "perfil"];
const adminViews = ["admin"];

function getRoute() {
  const hashRoute = window.location.hash.replace("#", "");
  return hashRoute.split("&")[0].split("#")[0] || "inicio";
}

function normalizeRoute(route, user) {
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "admin";

  if (!isLoggedIn && [...playerViews, ...adminViews].includes(route)) {
    return "login";
  }

  if (isLoggedIn && !isAdmin && publicViews.includes(route) && !["ranking", "restablecer"].includes(route)) {
    return "dashboard";
  }

  if (adminViews.includes(route) && !isAdmin) {
    return "dashboard";
  }

  if (route === "predictionModule") {
    return isLoggedIn ? "predicciones" : "login";
  }

  return route;
}

export function renderRoute(user) {
  const normalizedRoute = normalizeRoute(getRoute(), user);
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "admin";
  const visibleIds = new Set();

  document.body.className = document.body.className
    .split(" ")
    .filter((className) => !className.startsWith("route-"))
    .join(" ");
  document.body.classList.add(`route-${normalizedRoute}`);

  if (normalizedRoute === "restablecer") {
    visibleIds.add("restablecer");
  } else if (!isLoggedIn || (isAdmin && publicViews.includes(normalizedRoute))) {
    if (normalizedRoute === "inicio") {
      ["hero", "ticker", "como-funciona", "premios"].forEach((id) => visibleIds.add(id));
    } else {
      visibleIds.add(normalizedRoute);
    }
  } else if (["dashboard", "predicciones", "retos", "grupos", "perfil"].includes(normalizedRoute)) {
    visibleIds.add("dashboard");
  } else if (normalizedRoute === "admin") {
    visibleIds.add("admin");
  } else if (normalizedRoute === "ranking") {
    visibleIds.add("ranking");
  }

  document.querySelectorAll("[data-view]").forEach((section) => {
    section.classList.toggle("is-hidden", !visibleIds.has(section.dataset.view));
  });

  document.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
    const showAllPanels = normalizedRoute === "dashboard";
    panel.classList.toggle(
      "is-hidden",
      isLoggedIn && !showAllPanels && panel.dataset.dashboardPanel !== normalizedRoute
    );
  });

  document.querySelectorAll(".nav a[href^='#']").forEach((link) => {
    link.classList.toggle("is-active-route", link.getAttribute("href") === `#${normalizedRoute}`);
  });

  if (
    window.location.hash !== `#${normalizedRoute}` &&
    !window.location.hash.startsWith(`#${normalizedRoute}&`) &&
    !window.location.hash.startsWith(`#${normalizedRoute}#`)
  ) {
    history.replaceState(null, "", `#${normalizedRoute}`);
  }
}
