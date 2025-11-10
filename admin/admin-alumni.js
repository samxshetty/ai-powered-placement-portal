document.addEventListener("DOMContentLoaded", () => {
  const alumniListEl = document.getElementById("alumniList");
  const modal = document.getElementById("alumniModal");
  const form = document.getElementById("alumniForm");
  const modalTitle = document.getElementById("modalTitle");
  const saveBtn = document.getElementById("saveAlumniBtn");
  const addBtn = document.getElementById("openAddAlumni");

  let editId = null;

  // ---- Dummy Data ----
  let alumniData = JSON.parse(localStorage.getItem("alumniData")) || [
    {
      id: 1,
      name: "Rajesh Kumar",
      batch: "2020",
      role: "Senior Software Engineer",
      company: "Microsoft",
      cgpa: "8.9",
      exp: "3",
      linkedin: "https://linkedin.com/in/rajeshkumar",
      advice: "Focus on problem-solving and never stop learning.",
      photo: "",
    },
    {
      id: 2,
      name: "Priya Sharma",
      batch: "2019",
      role: "Product Manager",
      company: "Google",
      cgpa: "9.2",
      exp: "4",
      linkedin: "",
      advice: "Build strong communication skills alongside technical expertise.",
      photo: "",
    },
  ];

  // ---- Render Alumni Cards ----
  function renderAlumni() {
    alumniListEl.innerHTML = "";

    if (alumniData.length === 0) {
      alumniListEl.innerHTML = `<p class="empty">No alumni records found.</p>`;
      return;
    }

    alumniData.forEach((a) => {
      const card = document.createElement("div");
      card.className = "alumni-card";
      card.innerHTML = `
        <div class="alumni-header">
          <div class="alumni-avatar">${a.name[0]}${a.name.split(" ")[1]?.[0] || ""}</div>
          <div class="alumni-info">
            <h3>${a.name}</h3>
            <p>Batch ${a.batch}</p>
          </div>
        </div>

        <div class="alumni-company">${a.role}</div>
        <div class="alumni-meta">${a.company}<br>CGPA: ${a.cgpa} • ${a.exp} years exp</div>
        <div class="alumni-advice">"${a.advice}"</div>

        <div class="alumni-actions">
          <button class="linkedin-btn" onclick="window.open('${a.linkedin}', '_blank')">
            <i data-lucide="linkedin"></i> LinkedIn
          </button>
          <div>
            <button class="icon-btn edit-btn" data-id="${a.id}" title="Edit"><i data-lucide="edit-2"></i></button>
            <button class="icon-btn delete-btn" data-id="${a.id}" title="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `;
      alumniListEl.appendChild(card);
    });

    lucide.createIcons(); 
    attachDynamicEvents(); 
  }

  // ---- Attach Dynamic Edit/Delete ----
  function attachDynamicEvents() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        editAlumni(id);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        deleteAlumni(id);
      });
    });
  }

  // ---- Modal Controls ----
  function openModal(isEdit = false) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    modalTitle.textContent = isEdit ? "Edit Alumni" : "Add Alumni";
  }

  function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    form.reset();
    editId = null;
  }

  document.querySelectorAll("[data-close='alumniModal']").forEach((b) =>
    b.addEventListener("click", closeModal)
  );

  // ---- Add New Alumni ----
  addBtn.addEventListener("click", () => {
    saveBtn.textContent = "Add Alumni";
    form.reset();
    editId = null;
    openModal();
  });

  // ---- Submit (Add or Update) ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form));

    if (editId) {
      const idx = alumniData.findIndex((a) => a.id === editId);
      alumniData[idx] = { id: editId, ...formData };
    } else {
      alumniData.push({ id: Date.now(), ...formData });
    }

    localStorage.setItem("alumniData", JSON.stringify(alumniData));
    renderAlumni();
    closeModal();
  });

  // ---- Edit Alumni ----
  function editAlumni(id) {
    const a = alumniData.find((x) => x.id === id);
    if (!a) return;

    // Fill all inputs manually to ensure proper mapping
    form.name.value = a.name || "";
    form.batch.value = a.batch || "";
    form.role.value = a.role || "";
    form.company.value = a.company || "";
    form.cgpa.value = a.cgpa || "";
    form.exp.value = a.exp || "";
    form.linkedin.value = a.linkedin || "";
    form.advice.value = a.advice || "";
    form.photo.value = a.photo || "";

    editId = id;
    saveBtn.textContent = "Update Alumni";
    openModal(true);
  }

  // ---- Delete Alumni ----
  function deleteAlumni(id) {
    if (confirm("Are you sure you want to delete this alumni?")) {
      alumniData = alumniData.filter((a) => a.id !== id);
      localStorage.setItem("alumniData", JSON.stringify(alumniData));
      renderAlumni();
    }
  }

  // ---- INIT ----
  renderAlumni();
});
