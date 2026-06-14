export const teamFlags = {
  Alemania: "🇩🇪",
  "Arabia Saudita": "🇸🇦",
  Argelia: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Bélgica: "🇧🇪",
  "Bosnia y Herzegovina": "🇧🇦",
  Brasil: "🇧🇷",
  "Cabo Verde": "🇨🇻",
  Canadá: "🇨🇦",
  Colombia: "🇨🇴",
  "Congo DR": "🇨🇩",
  "Corea del Sur": "🇰🇷",
  "Costa de Marfil": "🇨🇮",
  Croacia: "🇭🇷",
  Curaçao: "🇨🇼",
  Ecuador: "🇪🇨",
  Egipto: "🇪🇬",
  Escocia: "🏴",
  España: "🇪🇸",
  "Estados Unidos": "🇺🇸",
  Francia: "🇫🇷",
  Ghana: "🇬🇭",
  Haití: "🇭🇹",
  Inglaterra: "🏴",
  Irak: "🇮🇶",
  Irán: "🇮🇷",
  Japón: "🇯🇵",
  Jordania: "🇯🇴",
  Marruecos: "🇲🇦",
  México: "🇲🇽",
  Noruega: "🇳🇴",
  "Nueva Zelanda": "🇳🇿",
  "Países Bajos": "🇳🇱",
  Panamá: "🇵🇦",
  Paraguay: "🇵🇾",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "República Checa": "🇨🇿",
  Senegal: "🇸🇳",
  Sudáfrica: "🇿🇦",
  Suecia: "🇸🇪",
  Suiza: "🇨🇭",
  Túnez: "🇹🇳",
  Turquía: "🇹🇷",
  Uruguay: "🇺🇾",
  Uzbekistán: "🇺🇿",
};

export function getTeamFlag(team) {
  return teamFlags[team] || "🏳️";
}

export function formatTeamLabel(team) {
  const label = team || "-";

  if (label === "-" || label === "Sin equipo definido") {
    return label;
  }

  return `${getTeamFlag(label)} ${label}`;
}

export function formatMatchLabel(match) {
  if (!match) {
    return "Partido no encontrado";
  }

  return `${formatTeamLabel(match.homeTeam)} vs ${formatTeamLabel(match.awayTeam)}`;
}
