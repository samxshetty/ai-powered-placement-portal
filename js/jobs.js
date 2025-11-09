// js/jobs.js — updated with "Applied" filter & dynamic button
document.addEventListener("DOMContentLoaded", () => {
  const jobs = window.__PLACEMENTHUB_JOBS || [];
  const activeUser = localStorage.getItem("activeUser") || "guest";
  const apps = JSON.parse(localStorage.getItem("applications_" + activeUser) || "[]");

  const grid = document.getElementById("jobsGrid");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  // Add new filter option dynamically
  if (statusFilter && ![...statusFilter.options].some(o => o.value === "applied")) {
    const opt = document.createElement("option");
    opt.value = "applied";
    opt.textContent = "Applied";
    statusFilter.appendChild(opt);
  }

  function hasApplied(jobId) {
    return apps.some(a => a.jobId === jobId || a.eventId === jobId);
  }

  function renderJobs(filterText = "", status = "all") {
    grid.innerHTML = "";

    const filtered = jobs.filter(job => {
      const matchesText =
        job.company.toLowerCase().includes(filterText.toLowerCase()) ||
        job.role.toLowerCase().includes(filterText.toLowerCase()) ||
        (job.skills || []).some(s => s.toLowerCase().includes(filterText.toLowerCase()));

      if (status === "applied") return hasApplied(job.id);
      const matchesStatus = status === "all" || job.status === status;
      return matchesText && matchesStatus;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#64748b;background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
        No matching jobs found.
      </div>`;
      return;
    }

    filtered.forEach(job => {
      const applied = hasApplied(job.id);
      const card = document.createElement("div");
      card.className = "job-card";
      card.innerHTML = `
        <div class="job-header">
          <h3>${job.company}</h3>
          <span class="tag">${job.type}</span>
        </div>
        <div class="role-line">
          ${job.role}
          <span class="tier ${job.tier}">
            ${job.tier === "super" ? "Super Dream" : job.tier === "dream" ? "Dream" : "Mass"}
          </span>
        </div>
        <div class="job-details">
          <span>📍 ${job.location}</span><br>
          <span>💰 ${job.salary}</span><br>
          <span>🕒 Apply by: ${job.deadline}</span>
        </div>
        <span class="status ${job.status}">
          ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </span>
        <div class="skills">
          ${(job.skills || []).map(s => `<span class="skill">${s}</span>`).join("")}
        </div>
        <div style="margin-top:12px;">
          ${
            applied
              ? `<button class="view-btn btn-primary" style="background:#94a3b8;cursor:not-allowed;" disabled>Already Applied</button>`
              : `<button class="view-btn btn-primary" data-id="${job.id}">View More</button>`
          }
        </div>
      `;
      grid.appendChild(card);

      if (!applied) {
        card.querySelector(".view-btn").addEventListener("click", () => {
          window.location.href = `job-details.html?id=${job.id}`;
        });
      }
    });
  }

  searchInput?.addEventListener("input", () =>
    renderJobs(searchInput.value, statusFilter.value)
  );

  statusFilter?.addEventListener("change", () =>
    renderJobs(searchInput.value, statusFilter.value)
  );

  renderJobs();
});
