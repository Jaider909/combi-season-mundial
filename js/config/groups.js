export const worldCupGroups = [
  {
    id: "A",
    teams: ["México", "Corea del Sur", "Sudáfrica", "República Checa"],
  },
  {
    id: "B",
    teams: ["Canadá", "Bosnia y Herzegovina", "Qatar", "Suiza"],
  },
  {
    id: "C",
    teams: ["Brasil", "Marruecos", "Haití", "Escocia"],
  },
  {
    id: "D",
    teams: ["Estados Unidos", "Australia", "Paraguay", "Turquía"],
  },
  {
    id: "E",
    teams: ["Alemania", "Ecuador", "Costa de Marfil", "Curaçao"],
  },
  {
    id: "F",
    teams: ["Países Bajos", "Japón", "Túnez", "Suecia"],
  },
  {
    id: "G",
    teams: ["Bélgica", "Irán", "Egipto", "Nueva Zelanda"],
  },
  {
    id: "H",
    teams: ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"],
  },
  {
    id: "I",
    teams: ["Francia", "Senegal", "Noruega", "Irak"],
  },
  {
    id: "J",
    teams: ["Argentina", "Austria", "Argelia", "Jordania"],
  },
  {
    id: "K",
    teams: ["Portugal", "Colombia", "Uzbekistán", "Congo DR"],
  },
  {
    id: "L",
    teams: ["Inglaterra", "Croacia", "Panamá", "Ghana"],
  },
];

export function findGroupByTeam(teamName) {
  return worldCupGroups.find((group) => group.teams.includes(teamName)) || null;
}
