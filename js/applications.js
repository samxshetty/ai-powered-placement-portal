import { db } from "../js/firebase-init.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const appList = document.getElementById("applicationList");
  const filterAll = document.getElementById("filterAll");
  const filterActive = document.getElementById("filterActive");
  const filterClosed = document.getElementById("filterClosed");

  const withdrawModal = document.getElementById("withdrawModal");
  const withdrawText = document.getElementById("withdrawText");
  const confirmWithdraw = document.getElementById("confirmWithdraw");
  const closeWithdraw = document.getElementById("closeWithdraw");
  const cancelWithdraw = document.getElementById("cancelWithdraw");

  const studentId = localStorage.getItem("activeUserId");
  if (!studentId) {
    window.location.href = "index.html";
    return;
  }

  let allApplications = [];
  let currentFilter = "All";
  let selectedApp = null;

  function renderApplications(list) {
    appList.innerHTML = "";
    if (list.length === 0) {
      appList.innerHTML = `<p class="muted" style="text-align:center;margin:20px;">No applications found.</p>`;
      return;
    }

    list.forEach((app) => {
      const div = document.createElement("div");
      div.className = "application-card";
      const appliedDate = app.appliedAt
        ? new Date(app.appliedAt).toLocaleDateString()
        : "N/A";
      const statusColor =
        app.status === "Applied"
          ? "#2563eb"
          : app.status === "Shortlisted"
          ? "#10b981"
          : app.status === "Rejected"
          ? "#dc2626"
          : app.status === "Selected"
          ? "#16a34a"
          : "#64748b";

      div.innerHTML = `
        <div class="app-info">
          <h4>${app.jobCompany || "Unknown Company"}</h4>
          <p>${app.jobRole || "N/A"}</p>
          <p class="muted" style="font-size:12px;margin-top:4px;">
            Applied on ${appliedDate}
          </p>
          <p style="margin-top:6px;font-weight:600;color:${statusColor}">
            ${app.status}
          </p>
        </div>
        <div class="action-buttons">
          <button class="btn-small view-btn" data-id="${app.jobId}">View</button>
          <button class="btn-small withdraw-btn" data-id="${app.id}">Withdraw</button>
        </div>
      `;
      appList.appendChild(div);
    });
  }

  function filterApplications(type) {
    currentFilter = type;
    let filtered = [];

    if (type === "Active")
      filtered = allApplications.filter((a) =>
        ["Applied", "Shortlisted", "Interview"].includes(a.status)
      );
    else if (type === "Closed")
      filtered = allApplications.filter((a) =>
        ["Rejected", "Selected"].includes(a.status)
      );
    else filtered = allApplications;

    [filterAll, filterActive, filterClosed].forEach((b) =>
      b.classList.remove("active")
    );
    if (type === "Active") filterActive.classList.add("active");
    else if (type === "Closed") filterClosed.classList.add("active");
    else filterAll.classList.add("active");

    renderApplications(filtered);
  }

  const q = query(collection(db, "applications"), where("studentId", "==", studentId));

  onSnapshot(q, (snapshot) => {
    allApplications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    filterApplications(currentFilter);
  });

  appList.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.classList.contains("view-btn")) {
      const jobId = target.dataset.id;
      if (jobId) {
        window.location.href = `job-details.html?id=${jobId}`;
      }
    }

    if (target.classList.contains("withdraw-btn")) {
      const appId = target.dataset.id;
      selectedApp = allApplications.find((a) => a.id === appId);
      if (!selectedApp) return alert("Application not found.");

      withdrawText.textContent = `Are you sure you want to withdraw your application for "${selectedApp.jobCompany}"?`;
      withdrawModal.style.display = "flex";
    }
  });

  confirmWithdraw.addEventListener("click", async () => {
    if (!selectedApp) return;

    try {
      await deleteDoc(doc(db, "applications", selectedApp.id));
      withdrawModal.style.display = "none";
      alert("✅ Application withdrawn successfully.");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to withdraw application.");
    }
  });

  [closeWithdraw, cancelWithdraw].forEach((btn) =>
    btn?.addEventListener("click", () => {
      withdrawModal.style.display = "none";
      selectedApp = null;
    })
  );

  filterAll.addEventListener("click", () => filterApplications("All"));
  filterActive.addEventListener("click", () => filterApplications("Active"));
  filterClosed.addEventListener("click", () => filterApplications("Closed"));
});
