document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("studentTableBody");
  const studentModal = document.getElementById("studentModal");
  const studentDetails = document.getElementById("studentDetails");
  const closeBtn = document.querySelector("[data-close='studentModal']");

  const totalEl = document.getElementById("totalStudents");
  const placedEl = document.getElementById("placedStudents");
  const activeEl = document.getElementById("activeStudents");
  const cgpaEl = document.getElementById("avgCGPA");

  // ===== Load data from localStorage or fallback to default =====
  let students = JSON.parse(localStorage.getItem("students")) || [
    {
      usn: "4NM21CS001",
      name: "Aarav Sharma",
      email: "aarav.sharma@nmamit.in",
      branch: "Computer Science",
      sem: 6,
      cgpa: 8.9,
      backlog: 0,
      status: "Placed",
      company: "Google",
      applied: 15,
      attended: 8,
      phone: "+91 98765 43210",
      address: "Nitte, Karkala, Karnataka",
      skills: ["React", "Node.js", "Python", "MongoDB"],
    },
    {
      usn: "4NM21EC045",
      name: "Priya Rao",
      email: "priya.rao@nmamit.in",
      branch: "Electronics",
      sem: 6,
      cgpa: 9.2,
      backlog: 0,
      status: "Active",
      company: "-",
      applied: 12,
      attended: 6,
      phone: "+91 98765 43211",
      address: "Mangalore, Karnataka",
      skills: ["VLSI", "Embedded Systems", "C++", "Python"],
    },
    {
      usn: "4NM21ME078",
      name: "Rohan Kumar",
      email: "rohan.kumar@nmamit.in",
      branch: "Mechanical",
      sem: 6,
      cgpa: 7.8,
      backlog: 1,
      status: "Active",
      company: "-",
      applied: 8,
      attended: 4,
      phone: "+91 98765 43212",
      address: "Udupi, Karnataka",
      skills: ["AutoCAD", "SolidWorks", "Python"],
    },
    {
      usn: "4NM21IS032",
      name: "Ananya Patel",
      email: "ananya.patel@nmamit.in",
      branch: "Information Science",
      sem: 6,
      cgpa: 9.5,
      backlog: 0,
      status: "Placed",
      company: "Amazon",
      applied: 10,
      attended: 5,
      phone: "+91 98765 43213",
      address: "Udupi, Karnataka",
      skills: ["React", "JavaScript", "Machine Learning"],
    },
    {
      usn: "4NM21CV019",
      name: "Vikram Singh",
      email: "vikram.singh@nmamit.in",
      branch: "Civil",
      sem: 6,
      cgpa: 8.2,
      backlog: 0,
      status: "Active",
      company: "-",
      applied: 6,
      attended: 3,
      phone: "+91 98765 43214",
      address: "Karkala, Karnataka",
      skills: ["AutoCAD", "Structural Design"],
    },
  ];

  // ===== Initial Render =====
  renderTable();
  updateStats();

  // ===== Save to Local Storage =====
  function saveToStorage() {
    localStorage.setItem("students", JSON.stringify(students));
  }

  // ===== Render Table =====
  function renderTable() {
    tbody.innerHTML = "";
    students.forEach((s) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.usn}</td>
        <td><strong>${s.name}</strong><br><small>${s.email}</small></td>
        <td>${s.branch}</td>
        <td>${s.sem}</td>
        <td>${s.cgpa}</td>
        <td>${s.backlog}</td>
        <td><span class="badge-status ${s.status}">${s.status}</span></td>
        <td>${s.company}</td>
        <td>${s.applied} Applied / ${s.attended} Attended</td>
        <td>
          <button class="btn btn-outline" data-action="view" data-usn="${s.usn}">👁️</button>
          <button class="btn btn-outline delete-btn" data-action="delete" data-usn="${s.usn}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // ===== Update Stats =====
  function updateStats() {
    const total = students.length;
    const placed = students.filter((s) => s.status === "Placed").length;
    const active = students.filter((s) => s.status === "Active").length;
    const avgCgpa = total ? students.reduce((sum, s) => sum + s.cgpa, 0) / total : 0;

    totalEl.textContent = total;
    placedEl.textContent = placed;
    activeEl.textContent = active;
    cgpaEl.textContent = avgCgpa.toFixed(2);
  }

  // ===== Handle Table Buttons =====
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const usn = btn.dataset.usn;
    const action = btn.dataset.action;

    if (action === "view") {
      const student = students.find((s) => s.usn === usn);
      if (student) showProfile(student);
    } else if (action === "delete") {
      deleteStudent(usn);
    }
  });

  // ===== Show Student Profile =====
  function showProfile(s) {
    const initials = s.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    studentDetails.innerHTML = `
      <div class="student-card">
        <div class="student-header">
          <div class="avatar-circle">${initials}</div>
          <div class="student-info">
            <h2>${s.name} <span class="badge-status ${s.status}">${s.status}</span></h2>
            <p class="usn">${s.usn}</p>
            <p class="meta">${s.branch} • Semester ${s.sem}</p>
          </div>
        </div>

        <div class="contact-card">
          <h4>Contact Information</h4>
          <div class="contact-details">
            <div>📧 ${s.email}</div>
            <div>📞 ${s.phone}</div>
            <div>📍 ${s.address}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><div class="stat-value">${s.cgpa}</div><div class="stat-label">CGPA</div></div>
          <div class="stat-box"><div class="stat-value">${s.backlog}</div><div class="stat-label">Backlogs</div></div>
          <div class="stat-box"><div class="stat-value">${s.applied}</div><div class="stat-label">Applied Jobs</div></div>
          <div class="stat-box"><div class="stat-value">${s.attended}</div><div class="stat-label">Attended Drives</div></div>
        </div>

        <div class="skills-section">
          <h4>Skills & Expertise</h4>
          <div class="skills">
            ${s.skills.map(skill => `<span class="tag">${skill}</span>`).join("")}
          </div>
        </div>

        ${s.status === "Placed" ? `<div class="placement-card">Placed at <b>${s.company}</b></div>` : ""}
      </div>
    `;

    studentModal.classList.remove("hidden");
    studentModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  // ===== Delete Student =====
  function deleteStudent(usn) {
    if (confirm("Are you sure you want to delete this student record?")) {
      students = students.filter((s) => s.usn !== usn);
      renderTable();
      updateStats();
      saveToStorage();
    }
  }

  // ===== Close Modal =====
  closeBtn.addEventListener("click", () => {
    studentModal.classList.add("hidden");
    studentModal.style.display = "none";
    document.body.style.overflow = "";
  });
});
