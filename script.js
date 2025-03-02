document.addEventListener("DOMContentLoaded", function() {
  const dmToggle = document.getElementById("dmToggle");
  const body = document.body;

  if (localStorage.getItem("theme") === "dark") {
      body.classList.add("dark-mode");
  }

  dmToggle.addEventListener("click", function() {
      body.classList.toggle("dark-mode");
      localStorage.setItem("theme", body.classList.contains("dark-mode") ? "dark" : "light");
  });

  // Call updateTimezone when the DOM is fully loaded
  updateTimezone();
  // Update the time every second
  setInterval(updateTime, 1000);

  const hamburger = document.querySelector('.navbar__hamburger');
  const menu = document.querySelector('.navbar__menu');
  
  hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      menu.classList.toggle('active');
      document.body.classList.toggle('menu-open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
      if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
          hamburger.classList.remove('active');
          menu.classList.remove('active');
          document.body.classList.remove('menu-open');
      }
  });
});

function updateTimezone() {
  const timezoneElement = document.getElementById("timezone");
  const utcOffsetElement = document.getElementById("utc-offset");

  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = now.getTimezoneOffset() / -60;

  timezoneElement.textContent = timezone;
  utcOffsetElement.textContent = `UTC ${offset >= 0 ? "+" + offset : offset}`;
}

function updateTime() {
  const timeElement = document.getElementById("time");
  const now = new Date();
  const timeString = now.toLocaleTimeString();

  timeElement.textContent = timeString;
}