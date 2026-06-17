export function hasMatchStarted(match) {
  const matchTime = new Date(match?.date).getTime();

  return Number.isFinite(matchTime) && matchTime <= Date.now();
}

export function isLockedMatch(match) {
  return match?.status === "locked";
}

export function isAdminOpenMatch(match) {
  return match?.status === "admin_open";
}

export function isLiveMatch(match) {
  return match?.status === "open" && hasMatchStarted(match);
}

export function isPredictionClosedForPlayer(match) {
  if (!match) {
    return true;
  }

  if (isAdminOpenMatch(match)) {
    return false;
  }

  return match.status === "finished" || isLockedMatch(match) || hasMatchStarted(match);
}

export function getMatchStatusView(match) {
  if (!match) {
    return { label: "Sin partido", className: "is-muted" };
  }

  if (match.status === "finished") {
    return { label: "Finalizado", className: "is-finished" };
  }

  if (isLockedMatch(match)) {
    return { label: "Cerrado", className: "is-locked" };
  }

  if (isAdminOpenMatch(match)) {
    return { label: "Reabierto", className: "is-open" };
  }

  if (isLiveMatch(match)) {
    return { label: "En vivo", className: "is-live" };
  }

  return { label: "Abierto", className: "is-open" };
}
