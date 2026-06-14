import { escapeHtml } from "./dom.js?v=safe-text";
import { formatTeamLabel } from "../config/team-flags.js?v=team-flags";

function isFinishedMatch(match) {
  return (
    match.status === "finished" &&
    Number.isFinite(Number(match.homeScore)) &&
    Number.isFinite(Number(match.awayScore))
  );
}

function getEmptyStanding(team) {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function applyResult(standing, goalsFor, goalsAgainst) {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }
}

function getGroupMatches(group, matches) {
  return matches.filter(
    (match) =>
      match.groupCode === group.id ||
      match.phase === `Grupo ${group.id}` ||
      (group.teams.includes(match.homeTeam) && group.teams.includes(match.awayTeam))
  );
}

function getGroupStandings(group, matches = []) {
  const standingsByTeam = new Map(group.teams.map((team) => [team, getEmptyStanding(team)]));

  getGroupMatches(group, matches)
    .filter(isFinishedMatch)
    .forEach((match) => {
      const home = standingsByTeam.get(match.homeTeam);
      const away = standingsByTeam.get(match.awayTeam);

      if (!home || !away) {
        return;
      }

      const homeScore = Number(match.homeScore);
      const awayScore = Number(match.awayScore);
      applyResult(home, homeScore, awayScore);
      applyResult(away, awayScore, homeScore);
    });

  return [...standingsByTeam.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team, "es");
  });
}

function getClosedGroupMatches(group, matches = []) {
  return getGroupMatches(group, matches).filter(isFinishedMatch).length;
}

function renderStandingRows(group, favoriteTeam, matches = []) {
  return getGroupStandings(group, matches)
    .map(
      (standing, index) => `
        <div class="group-row ${standing.team === favoriteTeam ? "is-favorite" : ""}">
          <span>${index + 1}</span>
          <strong>${escapeHtml(formatTeamLabel(standing.team))}</strong>
          <span>${standing.played}</span>
          <span>${standing.wins}</span>
          <span>${standing.draws}</span>
          <span>${standing.goalDifference}</span>
          <span>${standing.points}</span>
        </div>
      `
    )
    .join("");
}

export function renderUserGroup(group, favoriteTeam, matches = []) {
  const userGroup = document.querySelector("#userGroupTable");

  if (!group) {
    userGroup.innerHTML = '<p class="empty-group">Selecciona un equipo favorito para ver su grupo.</p>';
    return;
  }

  userGroup.innerHTML = `
    <div class="group-title-row">
      <span>Grupo ${group.id}</span>
      <strong>${getClosedGroupMatches(group, matches)} resultados</strong>
    </div>
    <div class="group-row group-header">
      <span>#</span>
      <span>Equipo</span>
      <span>PJ</span>
      <span>G</span>
      <span>E</span>
      <span>DG</span>
      <span>Pts</span>
    </div>
    ${renderStandingRows(group, favoriteTeam, matches)}
  `;
}

export function renderAllGroups(groups, favoriteTeam, matches = []) {
  const allGroups = document.querySelector("#allGroupsGrid");

  allGroups.innerHTML = groups
    .map(
      (group) => {
        const standings = getGroupStandings(group, matches);

        return `
        <article class="mini-group ${group.teams.includes(favoriteTeam) ? "is-active-group" : ""}">
          <h4>Grupo ${group.id} · ${getClosedGroupMatches(group, matches)} resultados</h4>
          ${standings
            .map(
              (standing, index) => `
                <div class="${standing.team === favoriteTeam ? "is-favorite" : ""}">
                  <span>${index + 1}</span>
                  <strong>${escapeHtml(formatTeamLabel(standing.team))}</strong>
                  <em>${standing.points} pts</em>
                </div>
              `
            )
            .join("")}
        </article>
      `;
      }
    )
    .join("");
}
