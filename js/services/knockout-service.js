import { worldCupGroups } from "../config/groups.js";

const groupMatchCount = 6;
const placeholderPatterns = [
  /^\d° Grupo [A-L]$/,
  /^3° Grupo [A-L](?:\/[A-L])*$/,
  /^Ganador partido \d+$/,
  /^Perdedor partido \d+$/,
];

const confirmedRoundOf32Teams = new Map([
  [73, { homeTeam: "Sudáfrica", awayTeam: "Canadá" }],
  [74, { homeTeam: "Alemania", awayTeam: "Paraguay" }],
  [75, { homeTeam: "Países Bajos", awayTeam: "Marruecos" }],
  [76, { homeTeam: "Brasil", awayTeam: "Japón" }],
  [77, { homeTeam: "Francia", awayTeam: "Suecia" }],
  [78, { homeTeam: "Costa de Marfil", awayTeam: "Noruega" }],
  [79, { homeTeam: "México", awayTeam: "Ecuador" }],
  [80, { homeTeam: "Inglaterra", awayTeam: "Congo DR" }],
  [81, { homeTeam: "Estados Unidos", awayTeam: "Bosnia y Herzegovina" }],
  [82, { homeTeam: "Bélgica", awayTeam: "Corea del Sur" }],
  [83, { homeTeam: "Portugal", awayTeam: "Croacia" }],
  [84, { homeTeam: "España", awayTeam: "Austria" }],
  [85, { homeTeam: "Suiza", awayTeam: "Argelia" }],
  [86, { homeTeam: "Argentina", awayTeam: "Cabo Verde" }],
  [87, { homeTeam: "Colombia", awayTeam: "Ghana" }],
  [88, { homeTeam: "Australia", awayTeam: "Egipto" }],
]);

function isFinishedMatch(match) {
  return (
    match?.status === "finished" &&
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

function getGroupStandings(group, matches) {
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

function buildGroupResults(matches) {
  return worldCupGroups.map((group) => {
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

function resolveGroupSlot(value, groupResults, qualifiedThirds) {
  const directMatch = value.match(/^([12])° Grupo ([A-L])$/);

  if (directMatch) {
    const [, position, groupId] = directMatch;
    const group = groupResults.find((item) => item.id === groupId);

    if (!group?.isComplete) {
      return value;
    }

    return group.standings[Number(position) - 1]?.team || value;
  }

  const thirdMatch = value.match(/^3° Grupo ([A-L](?:\/[A-L])*)$/);

  if (thirdMatch) {
    const eligibleGroups = thirdMatch[1].split("/");
    const qualifiedOptions = qualifiedThirds.filter((team) => eligibleGroups.includes(team.groupId));

    return qualifiedOptions.length === 1 ? qualifiedOptions[0].team : value;
  }

  return value;
}

function resolveKnockoutSlot(value, matchesByNumber) {
  const winnerMatch = value.match(/^Ganador partido (\d+)$/);
  const loserMatch = value.match(/^Perdedor partido (\d+)$/);
  const sourceMatchNumber = Number(winnerMatch?.[1] || loserMatch?.[1]);

  if (!sourceMatchNumber) {
    return value;
  }

  const sourceMatch = matchesByNumber.get(sourceMatchNumber);

  if (!isFinishedMatch(sourceMatch)) {
    return value;
  }

  const homeScore = Number(sourceMatch.homeScore);
  const awayScore = Number(sourceMatch.awayScore);

  if (homeScore === awayScore) {
    return value;
  }

  const winner = homeScore > awayScore ? sourceMatch.homeTeam : sourceMatch.awayTeam;
  const loser = homeScore > awayScore ? sourceMatch.awayTeam : sourceMatch.homeTeam;

  return winnerMatch ? winner : loser;
}

function resolveSlot(value, groupResults, qualifiedThirds, matchesByNumber) {
  return resolveKnockoutSlot(resolveGroupSlot(value, groupResults, qualifiedThirds), matchesByNumber);
}

export function buildKnockoutUpdates(matches) {
  const groupResults = buildGroupResults(matches);
  const qualifiedThirds = getQualifiedThirds(groupResults);
  const matchesByNumber = new Map(matches.map((match) => [match.matchNumber, match]));

  return matches
    .filter((match) => match.matchNumber >= 73)
    .map((match) => {
      const confirmedTeams = confirmedRoundOf32Teams.get(Number(match.matchNumber));
      const homeTeam =
        confirmedTeams?.homeTeam || resolveSlot(match.homeTeam, groupResults, qualifiedThirds, matchesByNumber);
      const awayTeam =
        confirmedTeams?.awayTeam || resolveSlot(match.awayTeam, groupResults, qualifiedThirds, matchesByNumber);
      const hasPlaceholder = isPlaceholderTeam(homeTeam) || isPlaceholderTeam(awayTeam);
      const status = isFinishedMatch(match) ? match.status : hasPlaceholder ? "locked" : match.status === "locked" ? "open" : match.status;

      return {
        id: match.id,
        matchNumber: match.matchNumber,
        homeTeam,
        awayTeam,
        status,
        changed:
          homeTeam !== match.homeTeam ||
          awayTeam !== match.awayTeam ||
          (match.status === "locked" && status === "open"),
      };
    })
    .filter((update) => update.changed);
}
