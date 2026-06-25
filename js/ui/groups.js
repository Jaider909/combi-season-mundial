import { escapeHtml } from "./dom.js?v=safe-text";
import { formatTeamLabel } from "../config/team-flags.js?v=team-flags";

const groupMatchCount = 6;
const placeholderPatterns = [
  /^\d° Grupo [A-L]$/,
  /^3° Grupo [A-L](?:\/[A-L])*$/,
  /^Ganador partido \d+$/,
  /^Perdedor partido \d+$/,
];

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
  return matches.filter((match) => {
    const matchNumber = Number(match.matchNumber);
    const isGroupStage = !Number.isFinite(matchNumber) || matchNumber <= 72;

    return (
      match.groupCode === group.id ||
      match.phase === `Grupo ${group.id}` ||
      (isGroupStage && group.teams.includes(match.homeTeam) && group.teams.includes(match.awayTeam))
    );
  });
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

function getQualifiedThirds(groupResults) {
  return groupResults
    .filter((group) => group.isComplete && group.standings[2])
    .map((group) => ({ ...group.standings[2], groupId: group.id }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team, "es");
    })
    .slice(0, 8);
}

function buildGroupResults(groups, matches) {
  return groups.map((group) => {
    const groupMatches = getGroupMatches(group, matches);

    return {
      id: group.id,
      isComplete: groupMatches.filter(isFinishedMatch).length === groupMatchCount,
      standings: getGroupStandings(group, matches),
    };
  });
}

function isPlaceholderTeam(team) {
  return placeholderPatterns.some((pattern) => pattern.test(team || ""));
}

function formatPathTeam(team, favoriteTeam) {
  const label = isPlaceholderTeam(team) ? "Por definir" : formatTeamLabel(team);
  return `<strong class="${team === favoriteTeam ? "is-favorite-team" : ""}">${escapeHtml(label)}</strong>`;
}

function getRoundLabel(matchNumber) {
  if (matchNumber >= 73 && matchNumber <= 88) return "16avos";
  if (matchNumber >= 89 && matchNumber <= 96) return "Octavos";
  if (matchNumber >= 97 && matchNumber <= 100) return "Cuartos";
  if (matchNumber >= 101 && matchNumber <= 102) return "Semifinales";
  if (matchNumber === 103) return "Tercer puesto";
  if (matchNumber === 104) return "Final";
  return "Otra ronda";
}

function renderGroupQualifiers(groupResults, qualifiedThirds, favoriteTeam) {
  return groupResults
    .map((group) => {
      const topTeams = group.standings.slice(0, 3);

      return `
        <article class="path-group">
          <h5>Grupo ${group.id}</h5>
          ${topTeams
            .map((standing, index) => {
              const thirdQualified = qualifiedThirds.some((team) => team.team === standing.team);
              const badge = index < 2 ? "Clasifica" : thirdQualified ? "Mejor 3°" : "3°";

              return `
                <div>
                  <span>${index + 1}</span>
                  ${formatPathTeam(standing.team, favoriteTeam)}
                  <em>${standing.points} pts · ${badge}</em>
                </div>
              `;
            })
            .join("")}
          <small>${group.isComplete ? "Grupo cerrado" : "En juego"}</small>
        </article>
      `;
    })
    .join("");
}

function renderKnockoutRounds(matches, favoriteTeam) {
  const knockoutMatches = matches
    .filter((match) => Number(match.matchNumber) >= 73 && Number(match.matchNumber) <= 104)
    .sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber));

  if (!knockoutMatches.length) {
    return '<p class="empty-group">Aún no hay partidos de eliminación cargados.</p>';
  }

  const rounds = knockoutMatches.reduce((items, match) => {
    const label = getRoundLabel(Number(match.matchNumber));
    const round = items.find((item) => item.label === label);

    if (round) {
      round.matches.push(match);
    } else {
      items.push({ label, matches: [match] });
    }

    return items;
  }, []);

  return rounds
    .map(
      (round) => `
        <article class="path-round">
          <h5>${escapeHtml(round.label)}</h5>
          ${round.matches
            .map(
              (match) => `
                <div class="path-match">
                  <span>Partido ${match.matchNumber || "-"}</span>
                  <div>
                    ${formatPathTeam(match.homeTeam, favoriteTeam)}
                    <small>vs</small>
                    ${formatPathTeam(match.awayTeam, favoriteTeam)}
                  </div>
                  <em>${escapeHtml(match.status || "open")}</em>
                </div>
              `
            )
            .join("")}
        </article>
      `
    )
    .join("");
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

export function renderTournamentPath(groups, favoriteTeam, matches = []) {
  const finalPath = document.querySelector("#finalPath");

  if (!finalPath) {
    return;
  }

  const groupResults = buildGroupResults(groups, matches);
  const qualifiedThirds = getQualifiedThirds(groupResults);

  finalPath.innerHTML = `
    <div class="panel-header final-path-header">
      <div>
        <span>Camino a la final</span>
        <h3>Grupos → 16avos → Octavos → Cuartos → Semis → Final</h3>
      </div>
    </div>
    <div class="path-section">
      <h4>Clasificados por grupo</h4>
      <div class="path-groups-grid">
        ${renderGroupQualifiers(groupResults, qualifiedThirds, favoriteTeam)}
      </div>
    </div>
    <div class="path-section">
      <h4>Llaves de eliminación</h4>
      <div class="path-rounds-grid">
        ${renderKnockoutRounds(matches, favoriteTeam)}
      </div>
    </div>
  `;
}
