import { db, auth } from "../js/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const userNameEl = document.getElementById("userName");
  const companiesCountEl = document.getElementById("companiesCount");
  const appliedCountEl = document.getElementById("appliedCount");
  const openCountEl = document.getElementById("openCount");
  const closedCountEl = document.getElementById("closedCount");
  const upcomingEventsEl = document.getElementById("upcomingEvents");
  const recentApplicationsEl = document.getElementById("recentApplications");
  const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const studentId = user.uid;
    const studentEmail = user.email || "student";
    userNameEl.textContent = studentEmail.split("@")[0];

    localStorage.setItem("activeUser", studentEmail);
    localStorage.setItem("activeUserId", studentId);

    await renderDashboard(studentId);
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout failed", err);
    }
  });

  async function renderDashboard(studentId) {
    const today = new Date();

    try {
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const openJobs = jobs.filter(j => (j.status || "").toLowerCase() === "open").length;
      const closedJobs = jobs.filter(j => (j.status || "").toLowerCase() === "closed").length;
      const upcomingJobs = jobs.filter(j => {
        const dl = j.deadline ? new Date(j.deadline) : null;
        return dl && dl > today;
      }).length;
      const expiredJobs = jobs.filter(j => {
        const dl = j.deadline ? new Date(j.deadline) : null;
        return dl && dl < today;
      }).length;

      companiesCountEl.textContent = upcomingJobs;
      openCountEl.textContent = openJobs;
      closedCountEl.textContent = expiredJobs;

      const appsQ = query(collection(db, "applications"), where("studentId", "==", studentId));
      const appsSnap = await getDocs(appsQ);
      const applications = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      appliedCountEl.textContent = applications.length;

      recentApplicationsEl.innerHTML = "";
      if (applications.length === 0) {
        recentApplicationsEl.innerHTML = `
          <div class="app-box">
            <h4>No applications yet</h4>
            <p class="muted">Apply to jobs to see them here.</p>
          </div>`;
      } else {
        const recent = applications
          .slice()
          .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
          .slice(0, 5);

        recent.forEach(app => {
          const div = document.createElement("div");
          div.className = "app-box";
          const appliedOn = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "-";
          const left = document.createElement("div");
          left.innerHTML = `<h4>${escapeHtml(app.jobCompany || "Unknown Company")}</h4>
                            <p class="muted">${escapeHtml(app.jobRole || "N/A")}</p>
                            <p class="muted" style="font-size:12px;margin-top:4px;">Applied on ${escapeHtml(appliedOn)}</p>`;

          const btn = document.createElement("button");
          btn.className = "btn-small";
          btn.textContent = "View";
          btn.dataset.id = app.jobId || "";
          btn.addEventListener("click", () => {
            if (btn.dataset.id) {
              window.location.href = "job-details.html?id=" + encodeURIComponent(btn.dataset.id);
            }
          });

          div.appendChild(left);
          div.appendChild(btn);
          recentApplicationsEl.appendChild(div);
        });
      }

      if (upcomingEventsEl) {
        upcomingEventsEl.innerHTML = "";
        const eventsSnap = await getDocs(collection(db, "events"));
        const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const upcoming = events
          .filter(e => e.date && new Date(e.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);

        if (upcoming.length === 0) {
          upcomingEventsEl.innerHTML = `
            <div class="event-box">
              <h4>No upcoming events</h4>
              <p class="muted">You have no scheduled interviews or activities.</p>
            </div>`;
        } else {
          upcoming.forEach(ev => {
            const div = document.createElement("div");
            div.className = "event-box";
            const left = document.createElement("div");
            left.innerHTML = `<h4>${escapeHtml(ev.title || "Placement Event")}</h4>
                              <p class="muted">${escapeHtml(ev.date || "")} • ${escapeHtml(ev.location || "TBD")}</p>`;
            const btn = document.createElement("button");
            btn.className = "btn-small";
            btn.textContent = "View";
            btn.addEventListener("click", () => { window.location.href = "calendar.html"; });

            div.appendChild(left);
            div.appendChild(btn);
            upcomingEventsEl.appendChild(div);
          });
        }
      }

    } catch (err) {
      console.error("Error rendering dashboard:", err);
    }
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
