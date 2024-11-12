  // Function to fetch and display data from the API
  async function fetchTimeData() {
    try {
      const response = await fetch("http://worldtimeapi.org/api/timezone/America/Los_Angeles");
      const data = await response.json();

      // Update the HTML with the fetched data
      document.getElementById("timezone").textContent = data.timezone;
      document.getElementById("utc_offset").textContent = data.utc_offset;
      document.getElementById("datetime").textContent = data.datetime;
      document.getElementById("day_of_week").textContent = data.day_of_week;
      document.getElementById("day_of_year").textContent = data.day_of_year;
      document.getElementById("week_number").textContent = data.week_number;
      document.getElementById("unixtime").textContent = data.unixtime;
      document.getElementById("abbreviation").textContent = data.abbreviation;

    } catch (error) {
      console.error("Error fetching the time data:", error);
    }
  }

  // Call the function to fetch and display data when the page loads
  fetchTimeData();