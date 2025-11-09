// js/applications.js — updated for job-details navigation
document.addEventListener("DOMContentLoaded", () => {
  const activeUser = localStorage.getItem("activeUser") || "guest";
  const allJobs = window.__PLACEMENTHUB_JOBS || [];

  const appList = document.getElementById("applicationList");
  const filterAll = document.getElementById("filterAll");
  const filterActive = document.getElementById("filterActive");
  const filterClosed = document.getElementById("filterClosed");
  const logoutBtn = document.getElementById("logoutBtn");

  const withdrawModal = document.getElementById("withdrawModal");
  const withdrawText = document.getElementById("withdrawText");
  const closeWithdraw = document.getElementById("closeWithdraw");
  const cancelWithdraw = document.getElementById("cancelWithdraw");
  const confirmWithdraw = document.getElementById("confirmWithdraw");

  let selectedApp = null;

  // LocalStorage helpers
  const getApplications = () =>
    JSON.parse(localStorage.getItem("applications_" + activeUser) || "[]");
  const saveApplications = (arr) =>
    localStorage.setItem("applications_" + activeUser, JSON.stringify(arr));

  const getJobFromApp = (app) => {
  if (!app || !window.__PLACEMENTHUB_JOBS) return null;
  const jobId = String(app.jobId || app.eventId || app.id || "").trim();
  return window.__PLACEMENTHUB_JOBS.find((j) => String(j.id) === jobId) || null;
};


  // Render
  function renderApplications(list) {
    appList.innerHTML = "";
    if (!list.length) {
      appList.innerHTML = `<p class="muted" style="text-align:center;margin:20px;">No applications found.</p>`;
      return;
    }

    list.forEach((app) => {
      const job = getJobFromApp(app);
      const company = job?.company || app.company || "Unknown";
      const role = job?.role || app.role || "N/A";
      const location = job?.location || app.location || "N/A";

      const appId =
        app.applicationId || app.id || app.eventId || app.jobId || Date.now();

      const div = document.createElement("div");
      div.className = "application-card";
      div.innerHTML = `
        <div class="app-info">
          <h4>${company}</h4>
          <p>${role} • ${location}</p>
          <p class="muted" style="font-size:12px;margin-top:4px;">
            Applied on ${app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div class="action-buttons">
          <button class="btn-small view-btn" data-id="${appId}">View</button>
          <button class="btn-small withdraw-btn" data-id="${appId}">Withdraw</button>
        </div>
      `;
      appList.appendChild(div);
    });
  }

  // Filters
  function filterApplications(type = "All") {
    const apps = getApplications();
    let filtered = [];

    if (type === "Active")
      filtered = apps.filter((a) =>
        ["Applied", "Shortlisted", "Interview"].includes(a.status)
      );
    else if (type === "Closed")
      filtered = apps.filter((a) =>
        ["Rejected", "Selected"].includes(a.status)
      );
    else filtered = apps;

    [filterAll, filterActive, filterClosed].forEach((b) =>
      b.classList.remove("active")
    );
    if (type === "Active") filterActive.classList.add("active");
    else if (type === "Closed") filterClosed.classList.add("active");
    else filterAll.classList.add("active");

    renderApplications(filtered);
  }

  // Handle clicks
  appList.addEventListener("click", (e) => {
    const target = e.target;
    const appId = target.dataset.id;
    const apps = getApplications();
    const app = apps.find(
      (a) =>
        String(a.applicationId) === String(appId) ||
        String(a.jobId) === String(appId) ||
        String(a.eventId) === String(appId)
    );
    const job = getJobFromApp(app);

    // ✅ VIEW → go to job-details.html
    if (target.classList.contains("view-btn")) {
    if (job) {
    const appId = app.applicationId || app.id || app.jobId || app.eventId;
    const jobId = job.id || app.jobId || app.eventId;
    window.location.href = `job-details.html?id=${jobId}&appId=${appId}`;
    } else {
    alert("⚠️ Job details not found for this application.");
    }
    return;
    }


    // WITHDRAW
    if (target.classList.contains("withdraw-btn")) {
      selectedApp = app;
      const displayName = job?.company || app.company || "this job";
      withdrawText.textContent = `Are you sure you want to withdraw your application for "${displayName}"?`;
      withdrawModal.style.display = "flex";
    }
  });

  // Withdraw confirm
  confirmWithdraw.addEventListener("click", () => {
    if (!selectedApp) return;
    const apps = getApplications();
    const updated = apps.filter(
      (a) =>
        a.applicationId !== selectedApp.applicationId &&
        a.jobId !== selectedApp.jobId
    );
    saveApplications(updated);
    withdrawModal.style.display = "none";
    selectedApp = null;
    alert("✅ Application withdrawn successfully.");
    filterApplications("All");
  });

  [closeWithdraw, cancelWithdraw].forEach((btn) =>
    btn?.addEventListener("click", () => {
      withdrawModal.style.display = "none";
      selectedApp = null;
    })
  );

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("activeUser");
    window.location.href = "login.html";
  });

  filterAll.addEventListener("click", () => filterApplications("All"));
  filterActive.addEventListener("click", () => filterApplications("Active"));
  filterClosed.addEventListener("click", () => filterApplications("Closed"));

  filterApplications("All");
});
