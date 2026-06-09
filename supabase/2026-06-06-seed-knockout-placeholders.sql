-- COMBI SEASON Mundial - partidos 73-104 como placeholders de eliminacion directa.
-- Fuente: FIFA World Cup 2026 knockout stage match schedule bracket.
-- Nota: FIFA publica los cruces y sedes; aqui usamos hora placeholder 20:00 UTC
-- hasta confirmar/ajustar horarios finos en la app.

insert into public.matches
  (match_number, match_date, phase, group_code, home_team, away_team, status, venue, city, source)
values
  (73, '2026-06-28T20:00:00+00:00', 'Dieciseisavos', null, '2° Grupo A', '2° Grupo B', 'locked', 'Los Angeles Stadium', 'Los Angeles', 'FIFA World Cup 2026 knockout bracket'),
  (74, '2026-06-29T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo E', '3° Grupo A/B/C/D/F', 'locked', 'Boston Stadium', 'Boston', 'FIFA World Cup 2026 knockout bracket'),
  (75, '2026-06-29T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo F', '2° Grupo C', 'locked', 'Estadio Monterrey', 'Monterrey', 'FIFA World Cup 2026 knockout bracket'),
  (76, '2026-06-29T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo C', '2° Grupo F', 'locked', 'Houston Stadium', 'Houston', 'FIFA World Cup 2026 knockout bracket'),
  (77, '2026-06-30T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo I', '3° Grupo C/D/F/G/H', 'locked', 'New York New Jersey Stadium', 'New York New Jersey', 'FIFA World Cup 2026 knockout bracket'),
  (78, '2026-06-30T20:00:00+00:00', 'Dieciseisavos', null, '2° Grupo E', '2° Grupo I', 'locked', 'Dallas Stadium', 'Dallas', 'FIFA World Cup 2026 knockout bracket'),
  (79, '2026-06-30T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo A', '3° Grupo C/E/F/H/I', 'locked', 'Mexico City Stadium', 'Mexico City', 'FIFA World Cup 2026 knockout bracket'),
  (80, '2026-07-01T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo L', '3° Grupo E/H/I/J/K', 'locked', 'Atlanta Stadium', 'Atlanta', 'FIFA World Cup 2026 knockout bracket'),
  (81, '2026-07-01T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo D', '3° Grupo B/E/F/I/J', 'locked', 'San Francisco Bay Area Stadium', 'San Francisco Bay Area', 'FIFA World Cup 2026 knockout bracket'),
  (82, '2026-07-01T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo G', '3° Grupo A/E/H/I/J', 'locked', 'Seattle Stadium', 'Seattle', 'FIFA World Cup 2026 knockout bracket'),
  (83, '2026-07-02T20:00:00+00:00', 'Dieciseisavos', null, '2° Grupo K', '2° Grupo L', 'locked', 'Toronto Stadium', 'Toronto', 'FIFA World Cup 2026 knockout bracket'),
  (84, '2026-07-02T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo H', '2° Grupo J', 'locked', 'Los Angeles Stadium', 'Los Angeles', 'FIFA World Cup 2026 knockout bracket'),
  (85, '2026-07-02T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo B', '3° Grupo E/F/G/I/J', 'locked', 'BC Place Vancouver', 'Vancouver', 'FIFA World Cup 2026 knockout bracket'),
  (86, '2026-07-03T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo J', '2° Grupo H', 'locked', 'Miami Stadium', 'Miami', 'FIFA World Cup 2026 knockout bracket'),
  (87, '2026-07-03T20:00:00+00:00', 'Dieciseisavos', null, '1° Grupo K', '3° Grupo D/E/I/J/L', 'locked', 'Kansas City Stadium', 'Kansas City', 'FIFA World Cup 2026 knockout bracket'),
  (88, '2026-07-03T20:00:00+00:00', 'Dieciseisavos', null, '2° Grupo D', '2° Grupo G', 'locked', 'Dallas Stadium', 'Dallas', 'FIFA World Cup 2026 knockout bracket'),
  (89, '2026-07-04T20:00:00+00:00', 'Octavos', null, 'Ganador partido 74', 'Ganador partido 77', 'locked', 'Philadelphia Stadium', 'Philadelphia', 'FIFA World Cup 2026 knockout bracket'),
  (90, '2026-07-04T20:00:00+00:00', 'Octavos', null, 'Ganador partido 73', 'Ganador partido 75', 'locked', 'Houston Stadium', 'Houston', 'FIFA World Cup 2026 knockout bracket'),
  (91, '2026-07-05T20:00:00+00:00', 'Octavos', null, 'Ganador partido 76', 'Ganador partido 78', 'locked', 'New York New Jersey Stadium', 'New York New Jersey', 'FIFA World Cup 2026 knockout bracket'),
  (92, '2026-07-05T20:00:00+00:00', 'Octavos', null, 'Ganador partido 79', 'Ganador partido 80', 'locked', 'Mexico City Stadium', 'Mexico City', 'FIFA World Cup 2026 knockout bracket'),
  (93, '2026-07-06T20:00:00+00:00', 'Octavos', null, 'Ganador partido 83', 'Ganador partido 84', 'locked', 'Dallas Stadium', 'Dallas', 'FIFA World Cup 2026 knockout bracket'),
  (94, '2026-07-06T20:00:00+00:00', 'Octavos', null, 'Ganador partido 81', 'Ganador partido 82', 'locked', 'Seattle Stadium', 'Seattle', 'FIFA World Cup 2026 knockout bracket'),
  (95, '2026-07-07T20:00:00+00:00', 'Octavos', null, 'Ganador partido 86', 'Ganador partido 88', 'locked', 'Atlanta Stadium', 'Atlanta', 'FIFA World Cup 2026 knockout bracket'),
  (96, '2026-07-07T20:00:00+00:00', 'Octavos', null, 'Ganador partido 85', 'Ganador partido 87', 'locked', 'BC Place Vancouver', 'Vancouver', 'FIFA World Cup 2026 knockout bracket'),
  (97, '2026-07-09T20:00:00+00:00', 'Cuartos', null, 'Ganador partido 89', 'Ganador partido 90', 'locked', 'Boston Stadium', 'Boston', 'FIFA World Cup 2026 knockout bracket'),
  (98, '2026-07-10T20:00:00+00:00', 'Cuartos', null, 'Ganador partido 93', 'Ganador partido 94', 'locked', 'Los Angeles Stadium', 'Los Angeles', 'FIFA World Cup 2026 knockout bracket'),
  (99, '2026-07-11T20:00:00+00:00', 'Cuartos', null, 'Ganador partido 91', 'Ganador partido 92', 'locked', 'Miami Stadium', 'Miami', 'FIFA World Cup 2026 knockout bracket'),
  (100, '2026-07-11T20:00:00+00:00', 'Cuartos', null, 'Ganador partido 95', 'Ganador partido 96', 'locked', 'Kansas City Stadium', 'Kansas City', 'FIFA World Cup 2026 knockout bracket'),
  (101, '2026-07-14T20:00:00+00:00', 'Semifinal', null, 'Ganador partido 97', 'Ganador partido 98', 'locked', 'Dallas Stadium', 'Dallas', 'FIFA World Cup 2026 knockout bracket'),
  (102, '2026-07-15T20:00:00+00:00', 'Semifinal', null, 'Ganador partido 99', 'Ganador partido 100', 'locked', 'Atlanta Stadium', 'Atlanta', 'FIFA World Cup 2026 knockout bracket'),
  (103, '2026-07-18T20:00:00+00:00', 'Tercer puesto', null, 'Perdedor partido 101', 'Perdedor partido 102', 'locked', 'Miami Stadium', 'Miami', 'FIFA World Cup 2026 knockout bracket'),
  (104, '2026-07-19T20:00:00+00:00', 'Final', null, 'Ganador partido 101', 'Ganador partido 102', 'locked', 'New York New Jersey Stadium', 'New York New Jersey', 'FIFA World Cup 2026 knockout bracket')
on conflict (match_number) do update set
  match_date = excluded.match_date,
  phase = excluded.phase,
  group_code = excluded.group_code,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  status = excluded.status,
  venue = excluded.venue,
  city = excluded.city,
  source = excluded.source;
