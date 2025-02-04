  document.addEventListener("DOMContentLoaded", function() {
    const dmToggle = document.getElementById("dmToggle");
    const body = document.body;

    if(localStorage.getItem("theme") === "dark") {
      body.classList.add("dark-mode");
    }

    dmToggle.addEventListener("click", function() {
      body.classList.toggle("dark-mode");
     localStorage.setItem("theme", body.classList.contains("dark-mode") ? "dark" : "light");
    });
  });

  document.addEventListener("DOMContentLoaded", function() {
    const timezoneElement = document.getElementById("timezone");
    const utcOffsetElement = document.getElementById("utc-offset");

    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = now.getTimezoneOffset() / -60;

    timezoneElement.textContent = timezone;
    utcOffsetElement.textContent = offset `UTC ${offset >= 0 ? "+" + offset : offset}`;
});