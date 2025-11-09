// js/calendar.js
document.addEventListener("DOMContentLoaded", () => {
  const PH = window.PlacementHub;
  const activeUser = PH.getActiveUser();
  const eventList = document.getElementById("eventList");
  const filterAll = document.getElementById("filterAll");
  const filterMine = document.getElementById("filterMine");
  const logoutBtn = document.getElementById("logoutBtn");

  const events = PH.getEvents();
  const myApps = PH.getApplications(activeUser);
  const myEventIds = myApps.map(a => a.eventId);

  function renderEvents(list) {
    eventList.innerHTML = "";
    if (!list.length) {
      eventList.innerHTML = `<p class="muted" style="text-align:center;margin:20px;">No events to display.</p>`;
      return;
    }
    list.forEach(ev => {
      const colorMap = { "Interview":"blue","PPT":"green","Test":"red","Drive":"gray" };
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <div class="event-header">
          <h4>${ev.name}</h4>
          <span class="badge ${colorMap[ev.type] || "blue"}">${ev.type}</span>
        </div>
        <div class="event-details">
          <p>${ev.date}</p>
          <p>${ev.time}</p>
          <p>${ev.location}</p>
        </div>
      `;
      eventList.appendChild(card);
    });
  }

  renderEvents(events);

  filterAll.addEventListener("click", () => {
    filterAll.classList.add("active");
    filterMine.classList.remove("active");
    renderEvents(events);
  });

  filterMine.addEventListener("click", () => {
    filterMine.classList.add("active");
    filterAll.classList.remove("active");
    const myEvents = events.filter(e => myEventIds.includes(e.id));
    renderEvents(myEvents);
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("activeUser");
    window.location.href = "login.html";
  });
});
