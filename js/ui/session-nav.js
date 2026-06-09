export function renderSessionNav(user) {
  const publicLinks = document.querySelectorAll("[data-public-nav]");
  const playerLinks = document.querySelectorAll("[data-player-nav]");
  const adminLinks = document.querySelectorAll("[data-admin-nav]");
  const userBadge = document.querySelector("#sessionUserBadge");
  const logoutButton = document.querySelector("#logoutButton");
  const adminSection = document.querySelector("#admin");
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "admin";

  publicLinks.forEach((link) => {
    link.classList.toggle("is-hidden", isLoggedIn);
  });

  playerLinks.forEach((link) => {
    link.classList.toggle("is-hidden", !isLoggedIn);
  });

  adminLinks.forEach((link) => {
    link.classList.toggle("is-hidden", !isAdmin);
  });

  logoutButton.classList.toggle("is-hidden", !isLoggedIn);
  userBadge.classList.toggle("is-hidden", !isLoggedIn);
  adminSection.classList.toggle("is-hidden", !isAdmin);

  if (isLoggedIn) {
    userBadge.textContent = isAdmin ? `${user.alias} · Admin` : user.alias;
  }
}
