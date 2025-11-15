import { db } from "../js/firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const eventList = document.getElementById("eventList");
  const filterAll = document.getElementById("filterAll");
  const filterMine = document.getElementById("filterMine");
  const logoutBtn = document.getElementById("logoutBtn");

  const studentId = localStorage.getItem("activeUserId");
  if (!studentId) {
    window.location.href = "index.html";
    return;
  }

  let allEvents = [];
  let myEventIds = [];

  async function fetchEvents() {
    const snap = await getDocs(collection(db, "events"));
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async function fetchMyApplications() {
    const appsSnap = await getDocs(
      query(collection(db, "applications"), where("studentId", "==", studentId))
    );
    const apps = appsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    myEventIds = apps.map((a) => a.eventId).filter((id) => !!id);
  }

  function renderEvents(events) {
    eventList.innerHTML = "";
    if (!events || events.length === 0) {
      eventList.innerHTML = `
        <p class="muted" style="text-align:center;margin:20px;">No events to display.</p>
      `;
      return;
    }

    const colorMap = {
      Interview: "interview",
      PPT: "ppt",
      Test: "test",
      Drive: "drive",
    };

    events.forEach((ev) => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <div class="event-header">
          <h4>${ev.title || ev.name || "Untitled Event"}</h4>
          <span class="badge ${colorMap[ev.type] || "interview"}">${ev.type || "Event"}</span>
        </div>
        <div class="event-details">
          <p>${ev.date || "No date"}</p>
          <p>${ev.time || "No time"}</p>
          <p>${ev.location || "TBD"}</p>
        </div>
      `;
      eventList.appendChild(div);
    });
  }

  filterAll.addEventListener("click", () => {
    filterAll.classList.add("active");
    filterMine.classList.remove("active");
    renderEvents(allEvents);
  });

  filterMine.addEventListener("click", () => {
    filterMine.classList.add("active");
    filterAll.classList.remove("active");
    const myEvents = allEvents.filter((e) => myEventIds.includes(e.id));
    renderEvents(myEvents);
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });

  try {
    const [events] = await Promise.all([fetchEvents(), fetchMyApplications()]);
    allEvents = events;
    renderEvents(allEvents);
  } catch (err) {
    console.error("Error fetching calendar data:", err);
    eventList.innerHTML = `<p class="muted" style="text-align:center;margin:20px;">Failed to load events.</p>`;
  }
});
