const launchDate = new Date("2026-06-11T00:00:00-05:00");

export function startCountdown(selector) {
  const countdown = document.querySelector(selector);

  if (!countdown) {
    return;
  }

  function updateCountdown() {
    const now = new Date();
    const difference = launchDate - now;

    if (difference <= 0) {
      countdown.textContent = "El Mundial ya empezó";
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / (1000 * 60)) % 60);

    countdown.textContent = `${days}d ${hours}h ${minutes}m`;
  }

  updateCountdown();
  setInterval(updateCountdown, 60_000);
}
