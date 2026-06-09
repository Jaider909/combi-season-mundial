export const teamPlayers = {
  Argentina: ["Lionel Messi", "Lautaro Martínez", "Julián Álvarez", "Ángel Di María", "Enzo Fernández"],
  Brasil: ["Vinícius Júnior", "Rodrygo", "Raphinha", "Endrick", "Neymar"],
  Colombia: ["Luis Díaz", "James Rodríguez", "Jhon Arias", "Jhon Córdoba", "Rafael Santos Borré"],
  Portugal: ["Cristiano Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rafael Leão", "Gonçalo Ramos"],
  México: ["Santiago Giménez", "Hirving Lozano", "Julián Quiñones", "Uriel Antuna", "Edson Álvarez"],
  España: ["Álvaro Morata", "Lamine Yamal", "Nico Williams", "Dani Olmo", "Pedri"],
  Francia: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé", "Marcus Thuram", "Olivier Giroud"],
  Inglaterra: ["Harry Kane", "Jude Bellingham", "Bukayo Saka", "Phil Foden", "Cole Palmer"],
  Alemania: ["Kai Havertz", "Jamal Musiala", "Florian Wirtz", "Niclas Füllkrug", "Leroy Sané"],
  Uruguay: ["Darwin Núñez", "Federico Valverde", "Luis Suárez", "Facundo Pellistri", "Rodrigo Bentancur"],
  "Países Bajos": ["Memphis Depay", "Cody Gakpo", "Xavi Simons", "Donyell Malen", "Wout Weghorst"],
  Bélgica: ["Romelu Lukaku", "Kevin De Bruyne", "Jérémy Doku", "Leandro Trossard", "Loïs Openda"],
  Croacia: ["Andrej Kramarić", "Luka Modrić", "Ivan Perišić", "Bruno Petković", "Mario Pašalić"],
  Marruecos: ["Achraf Hakimi", "Hakim Ziyech", "Youssef En-Nesyri", "Sofiane Boufal", "Amine Adli"],
  Japón: ["Takumi Minamino", "Takefusa Kubo", "Kaoru Mitoma", "Ritsu Doan", "Daichi Kamada"],
  "Estados Unidos": ["Christian Pulisic", "Giovanni Reyna", "Folarin Balogun", "Timothy Weah", "Weston McKennie"],
  "Corea del Sur": ["Son Heung-min", "Lee Kang-in", "Hwang Hee-chan", "Cho Gue-sung", "Hwang Ui-jo"],
  Sudáfrica: ["Percy Tau", "Themba Zwane", "Evidence Makgopa", "Teboho Mokoena", "Zakhele Lepasa"],
  Uzbekistán: ["Eldor Shomurodov", "Abbosbek Fayzullaev", "Igor Sergeev", "Jaloliddin Masharipov", "Oston Urunov"],
  "Congo DR": ["Cédric Bakambu", "Yoane Wissa", "Silas", "Théo Bongonda", "Meschack Elia"],
};

export function getPlayersForTeam(team) {
  return teamPlayers[team] || [];
}
