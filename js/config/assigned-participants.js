export const assignedParticipants = [
  { name: "Daniela Morales", email: "dmoralesotalvaro@gmail.com", team: "Francia" },
  { name: "Daniela Correa", email: "lesslydcorrea@gmail.com", team: "Países Bajos" },
  { name: "Aleja Morales", email: "amoralesotalvaro8@gmail.com", team: "Uruguay" },
  { name: "Mariana", email: "mh7028802@gmail.com", team: "Noruega" },
  { name: "Guaro", email: "sguarin1991@gmail.com", team: "Croacia" },
  { name: "Anderson", email: "andersonamariles17991@gmail.com", team: "Brasil" },
  { name: "Daniela Villa", email: "villadaniela1995@gmail.com", team: "Alemania" },
  { name: "Emiliano", email: "emilianojosevilla12@gmail.com", team: "Japón" },
  { name: "Julian Z", email: "julianz.98@hotmail.com", team: "Marruecos" },
  { name: "Cristian Zap", email: "cdzt10@gmail.com", team: "Suiza" },
  { name: "Papo", email: "jazl940726@gmail.com", team: "Ecuador" },
  { name: "Camilo", email: "kmig9507@gmail.com", team: "España" },
  { name: "Diego Tevez", email: "diego9305castro@gmail.com", team: "Inglaterra" },
  { name: "Gallego", email: "gallegol99@gmail.com", team: "Argentina" },
  { name: "Tavo", email: "gonzalezg6107@gmail.com", team: "Portugal" },
  { name: "Jaider", email: "jaimoro909@hotmail.com", team: "Colombia" },
  { name: "Fercho", email: "luisfgv1104@gmail.com", team: "Bélgica" },
  { name: "Mateo", email: "mateuro25@gmail.com", team: "Senegal" },
];

export function normalizeEmail(email) {
  return email?.toString().trim().toLowerCase() || "";
}

export function findAssignedParticipant(email) {
  const normalizedEmail = normalizeEmail(email);

  return assignedParticipants.find((participant) => participant.email === normalizedEmail) || null;
}
