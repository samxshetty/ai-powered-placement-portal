// js/dashboard.js — fully synced & View fixed
document.addEventListener("DOMContentLoaded", () => {
  const jobs = window.__PLACEMENTHUB_JOBS || [];

  // Helpers
  function getActiveUserId() {
    return localStorage.getItem("activeUser") || "guest";
  }
  function getApplications() {
    const key = "applications_" + getActiveUserId();
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  // Elements
  const userNameEl = document.getElementById("userName");
  const companiesCountEl = document.getElementById("companiesCount");
  const appliedCountEl = document.getElementById("appliedCount");
  const openCountEl = document.getElementById("openCount");
  const closedCountEl = document.getElementById("closedCount");
  const upcomingEventsEl = document.getElementById("upcomingEvents");
  const recentApplicationsEl = document.getElementById("recentApplications");

  // Active user info
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const activeUserId = getActiveUserId();
  const activeUser =
    users.find((u) => u.id === activeUserId) || users[users.length - 1] || null;
  if (userNameEl) userNameEl.textContent = activeUser?.name || "Student";

  // Stats
  function updateStats() {
    const apps = getApplications();
    const openJobs = jobs.filter((j) => j.status === "open").length;
    const closedJobs = jobs.filter((j) => j.status === "closed").length;
    const upcomingJobs = jobs.filter((j) => j.status === "upcoming").length;

    if (companiesCountEl) companiesCountEl.textContent = upcomingJobs;
    if (appliedCountEl) appliedCountEl.textContent = apps.length;
    if (openCountEl) openCountEl.textContent = openJobs;
    if (closedCountEl) closedCountEl.textContent = closedJobs;
  }

  // Upcoming Events
  function renderUpcomingEvents() {
    if (!upcomingEventsEl) return;
    upcomingEventsEl.innerHTML = "";

    const upcoming = jobs
      .filter((j) => j.status === "upcoming")
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (upcoming.length === 0) {
      upcomingEventsEl.innerHTML = `
        <div class="event-box">
          <div><h4>No upcoming events</h4>
          <p class="muted">You have no upcoming interviews or talks.</p></div>
        </div>`;
      return;
    }

    upcoming.forEach((job) => {
      const div = document.createElement("div");
      div.className = "event-box";
      div.innerHTML = `
        <div>
          <h4>${job.company} — ${job.role}</h4>
          <p class="muted">${job.deadline} • ${job.location}</p>
        </div>
        <button class="btn-small" data-id="${job.id}">View</button>`;
      div
        .querySelector("button")
        ?.addEventListener("click", () => {
          window.location.href = `job-details.html?id=${job.id}`;
        });
      upcomingEventsEl.appendChild(div);
    });
  }

  // Recent Applications
  function renderRecentApplications() {
    if (!recentApplicationsEl) return;
    recentApplicationsEl.innerHTML = "";

    const apps = getApplications().slice().reverse();

    if (apps.length === 0) {
      recentApplicationsEl.innerHTML = `
        <div class="app-box">
          <div>
            <h4>No applications yet</h4>
            <p class="muted">Apply to jobs from the Jobs page to see them here.</p>
          </div>
        </div>`;
      return;
    }

    apps.slice(0, 5).forEach((app) => {
      const job =
        jobs.find((j) => String(j.id) === String(app.jobId || app.eventId)) ||
        null;
      const company = job?.company || app.company || "Unknown";
      const role = job?.role || app.role || "N/A";
      const location = job?.location || app.location || "N/A";
      const appliedDate = app.appliedAt
        ? new Date(app.appliedAt).toLocaleString()
        : "N/A";

      const div = document.createElement("div");
      div.className = "app-box";
      div.innerHTML = `
        <div>
          <h4>${company}</h4>
          <p class="muted">${role} • ${location}</p>
          <p class="muted" style="font-size:12px;margin-top:6px;">Applied on: ${appliedDate}</p>
        </div>
        <button class="btn-small view-app" data-job="${job?.id || app.jobId || app.eventId}" data-app="${app.applicationId || app.id}">View</button>
      `;
      recentApplicationsEl.appendChild(div);
    });

    // ✅ Add working click handler for each “View” button
    recentApplicationsEl.querySelectorAll(".view-app").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = e.target.dataset.job;
        const appId = e.target.dataset.app;
        if (!jobId) {
          alert("⚠️ Job details not found for this application.");
          return;
        }
        window.location.href = `job-details.html?id=${jobId}&appId=${appId}`;
      });
    });
  }

  // Master render
  function renderAll() {
    updateStats();
    renderUpcomingEvents();
    renderRecentApplications();
  }

  // Live updates on change
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("applications_")) renderAll();
  });
  window.addEventListener("focus", renderAll);

  renderAll();
});
