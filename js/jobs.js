import { db } from "./firebase-init.js";
import {
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("jobsGrid");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const studentId = localStorage.getItem("activeUserId");

  if (!grid) {
    console.error("❌ jobsGrid element not found in HTML.");
    return;
  }

  function renderJobs(jobs, filter = "", status = "all") {
    grid.innerHTML = "";

    const filtered = jobs.filter((j) => {
      const text = (j.company + j.role + (j.skills || "")).toLowerCase();
      const matchesSearch = text.includes(filter.toLowerCase());
      const matchesStatus =
        status === "all" ||
        (status === "open" && (j.status || "").toLowerCase() === "open") ||
        (status === "closed" && (j.status || "").toLowerCase() === "closed");
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-jobs" style="grid-column:1/-1;text-align:center;color:#64748b;background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
          No matching jobs found.
        </div>`;
      return;
    }

    filtered.forEach((job) => {
      const card = document.createElement("div");
      card.className = "job-card";
      const deadline = job.deadline || "-";
      const category = job.category || "";
      const appliedText = job.alreadyApplied ? "✅ Applied" : "View Details";
      const appliedClass = job.alreadyApplied ? "btn-disabled" : "btn-primary";

      card.innerHTML = `
        <div class="job-header">
          <h3>${job.company}</h3>
          <span class="tag">${job.type || "N/A"}</span>
        </div>
        <div class="role-line">
          ${job.role || "Role not specified"}
          <span class="tier">${category}</span>
        </div>
        <div class="job-details">
          <span>📍 ${job.location || "N/A"}</span><br>
          <span>💰 ${job.package || "Not disclosed"}</span><br>
          <span>🕒 Apply by: ${deadline}</span>
        </div>
        <div style="margin-top:12px;">
          <button class="view-btn ${appliedClass}" data-id="${job.id}" ${job.alreadyApplied ? "disabled" : ""}>
            ${appliedText}
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll(".view-btn.btn-primary").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        window.location.href = `job-details.html?id=${id}`;
      });
    });
  }

  onSnapshot(collection(db, "jobs"), async (snapshot) => {
    let jobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    let appliedIds = [];
    if (studentId) {
      const appSnap = await getDocs(collection(db, "applications"));
      appliedIds = appSnap.docs
        .filter((d) => d.data().studentId === studentId)
        .map((d) => d.data().jobId);
    }

    jobs = jobs.map((j) => ({
      ...j,
      alreadyApplied: appliedIds.includes(j.id)
    }));

    renderJobs(jobs);

    if (!window._jobListenersAttached) {
      window._jobListenersAttached = true;

      searchInput?.addEventListener("input", () =>
        renderJobs(jobs, searchInput.value, statusFilter?.value || "all")
      );

      statusFilter?.addEventListener("change", () =>
        renderJobs(jobs, searchInput?.value || "", statusFilter.value)
      );
    }
  });
});
