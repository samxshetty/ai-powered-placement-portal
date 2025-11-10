// js/dashboard.js — Firebase + PlacementHub Dashboard Integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSnqOceW18iAhuHmWl31M3Gk38cdiWlHE",
  authDomain: "ai-powered-placement-portal.firebaseapp.com",
  projectId: "ai-powered-placement-portal",
storageBucket: "ai-powered-placement-portal.appspot.com",
  messagingSenderId: "814349983103",
  appId: "1:814349983103:web:56cd2a5c5356019223ce4a",
  measurementId: "G-RG8P2P71H7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const jobs = window.__PLACEMENTHUB_JOBS || [];

  // Elements
  const userNameEl = document.getElementById("userName");
  const companiesCountEl = document.getElementById("companiesCount");
  const appliedCountEl = document.getElementById("appliedCount");
  const openCountEl = document.getElementById("openCount");
  const closedCountEl = document.getElementById("closedCount");
  const upcomingEventsEl = document.getElementById("upcomingEvents");
  const recentApplicationsEl = document.getElementById("recentApplications");
  const logoutBtn = document.getElementById("logoutBtn");

  // 🧠 Load current Firebase user
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("⚠️ Please login first.");
      window.location.href = "login.html";
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(docRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      userNameEl.textContent = userData.full_name || "Student";
      console.log("✅ Logged in user:", userData.full_name || user.email);

      // Store session for local app logic
      localStorage.setItem("activeUser", user.email);
      localStorage.setItem("activeUserId", user.uid);
      localStorage.setItem("activeUserName", userData.full_name || "");
      localStorage.setItem("activeUserDept", userData.department || "");
      localStorage.setItem("activeUserYear", userData.year || "");
      localStorage.setItem("activeUserRoll", userData.roll_no || "");

      renderAll(); // render dashboard data after loading user
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  });

  // Logout function
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      alert("👋 Logged out successfully!");
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("❌ Error logging out. Try again.");
    }
  });

  // ========== Existing Logic ==========
  function getActiveUserId() {
    return localStorage.getItem("activeUserId") || "guest";
  }
  function getApplications() {
    const key = "applications_" + getActiveUserId();
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  function updateStats() {
    const apps = getApplications();
    const openJobs = jobs.filter((j) => j.status === "open").length;
    const closedJobs = jobs.filter((j) => j.status === "closed").length;
    const upcomingJobs = jobs.filter((j) => j.status === "upcoming").length;

    companiesCountEl.textContent = upcomingJobs;
    appliedCountEl.textContent = apps.length;
    openCountEl.textContent = openJobs;
    closedCountEl.textContent = closedJobs;
  }

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

  function renderAll() {
    updateStats();
    renderUpcomingEvents();
    renderRecentApplications();
  }

  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("applications_")) renderAll();
  });
  window.addEventListener("focus", renderAll);
});
