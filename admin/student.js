// student.js — Firebase-powered Student Management
import { db } from "../js/firebase-init.js";
import {
  collection,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("studentTableBody");
  const studentModal = document.getElementById("studentModal");
  const studentDetails = document.getElementById("studentDetails");
  const closeBtn = document.querySelector("[data-close='studentModal']");

  const totalEl = document.getElementById("totalStudents");
  const placedEl = document.getElementById("placedStudents");
  const activeEl = document.getElementById("activeStudents");
  const cgpaEl = document.getElementById("avgCGPA");

  const searchInput = document.getElementById("studentSearch");
  const branchFilter = document.getElementById("branchFilter");
  const statusFilter = document.getElementById("statusFilter");

  let students = [];

  // 🔹 Real-time sync from Firestore
  onSnapshot(collection(db, "students"), (snapshot) => {
    students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderTable(students);
    updateStats(students);
  });

  // 🔹 Render Table
  function renderTable(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No students found.</td></tr>`;
      return;
    }

    list.forEach((s) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.usn}</td>
        <td><strong>${s.name}</strong><br><small>${s.email || ""}</small></td>
        <td>${s.branch}</td>
        <td>${s.sem || "-"}</td>
        <td>${s.cgpa || "-"}</td>
        <td>${s.backlog || 0}</td>
        <td><span class="badge-status ${s.status}">${s.status}</span></td>
        <td>${s.company || "-"}</td>
        <td>${s.applied || 0} Applied / ${s.attended || 0} Attended</td>
        <td>
          <button class="btn btn-outline" data-action="view" data-id="${s.id}">👁️</button>
          <button class="btn btn-outline delete-btn" data-action="delete" data-id="${s.id}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // 🔹 Update Stats
  function updateStats(data) {
    const total = data.length;
    const placed = data.filter((s) => s.status === "Placed").length;
    const active = data.filter((s) => s.status === "Active").length;
    const avgCgpa = total ? data.reduce((sum, s) => sum + (Number(s.cgpa) || 0), 0) / total : 0;

    totalEl.textContent = total;
    placedEl.textContent = placed;
    activeEl.textContent = active;
    cgpaEl.textContent = avgCgpa.toFixed(2);
  }

  // 🔹 Search + Filter
  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const branch = branchFilter.value;
    const status = statusFilter.value;

    const filtered = students.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(term) || s.usn.toLowerCase().includes(term);
      const matchBranch = branch === "All" || s.branch.includes(branch);
      const matchStatus = status === "All" || s.status === status;
      return matchSearch && matchBranch && matchStatus;
    });

    renderTable(filtered);
  }

  searchInput.addEventListener("input", applyFilters);
  branchFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);

  // 🔹 Table Button Handlers
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "view") {
      const student = students.find((s) => s.id === id);
      if (student) showProfile(student);
    } else if (action === "delete") {
      deleteStudent(id);
    }
  });

  // 🔹 Show Profile Modal
  function showProfile(s) {
    const initials = s.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    studentDetails.innerHTML = `
      <div class="student-card">
        <div class="student-header">
          <div class="avatar-circle">${initials}</div>
          <div class="student-info">
            <h2>${s.name} <span class="badge-status ${s.status}">${s.status}</span></h2>
            <p class="usn">${s.usn}</p>
            <p class="meta">${s.branch} • Sem ${s.sem}</p>
          </div>
        </div>

        <div class="contact-card">
          <h4>Contact</h4>
          <div class="contact-details">
            <div>📧 ${s.email || "N/A"}</div>
            <div>📞 ${s.phone || "N/A"}</div>
            <div>📍 ${s.address || "N/A"}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><div class="stat-value">${s.cgpa || "-"}</div><div class="stat-label">CGPA</div></div>
          <div class="stat-box"><div class="stat-value">${s.backlog || 0}</div><div class="stat-label">Backlogs</div></div>
          <div class="stat-box"><div class="stat-value">${s.applied || 0}</div><div class="stat-label">Applied</div></div>
          <div class="stat-box"><div class="stat-value">${s.attended || 0}</div><div class="stat-label">Attended</div></div>
        </div>

        ${s.skills?.length ? `
        <div class="skills-section">
          <h4>Skills</h4>
          <div class="skills">${s.skills.map((sk) => `<span class="tag">${sk}</span>`).join("")}</div>
        </div>` : ""}
        
        ${s.status === "Placed" ? `<div class="placement-card">Placed at <b>${s.company}</b></div>` : ""}
      </div>
    `;

    studentModal.classList.remove("hidden");
    studentModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  // 🔹 Delete Student
  async function deleteStudent(id) {
    if (confirm("Are you sure you want to delete this student record?")) {
      await deleteDoc(doc(db, "students", id));
      alert("🗑️ Student deleted successfully.");
    }
  }

  // 🔹 Close Modal
  closeBtn.addEventListener("click", () => {
    studentModal.classList.add("hidden");
    studentModal.style.display = "none";
    document.body.style.overflow = "";
  });
});
