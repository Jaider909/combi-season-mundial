export function populateTeamOptions(selectElement, teams) {
  if (!selectElement) {
    return;
  }

  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    selectElement.append(option);
  });
}
