import { db } from "../js/firebase-init.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const alumniListEl = document.getElementById("alumniList");
  const modal = document.getElementById("alumniModal");
  const form = document.getElementById("alumniForm");
  const modalTitle = document.getElementById("modalTitle");
  const saveBtn = document.getElementById("saveAlumniBtn");
  const addBtn = document.getElementById("openAddAlumni");

  let editId = null;

  onSnapshot(collection(db, "alumni"), (snapshot) => {
  console.log("🔥 Firestore snapshot received:", snapshot.size);
  snapshot.docs.forEach((d) => console.log("Doc data:", d.data()));

  const alumni = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderAlumni(alumni);
});

  function renderAlumni(alumniList) {
    alumniListEl.innerHTML = "";

    if (!alumniList.length) {
      alumniListEl.innerHTML = `<p class="empty">No alumni records found.</p>`;
      return;
    }

    alumniList.forEach((a) => {
      const card = document.createElement("div");
      card.className = "alumni-card";
      card.innerHTML = `
        <div class="alumni-header">
          <div class="alumni-avatar">
            ${a.photo
              ? `<img src="${a.photo}" alt="${a.name}" />`
              : `${a.name[0]}${a.name.split(" ")[1]?.[0] || ""}`}
          </div>
          <div class="alumni-info">
            <h3>${a.name}</h3>
            <p>Batch ${a.batch}</p>
          </div>
        </div>

        <div class="alumni-company">${a.role}</div>
        <div class="alumni-meta">${a.company}<br>CGPA: ${a.cgpa || "-"} • ${a.exp || 0} yrs exp</div>
        <div class="alumni-advice">"${a.advice || ""}"</div>

        <div class="alumni-actions">
          ${a.linkedin ? `<button class="linkedin-btn" onclick="window.open('${a.linkedin}','_blank')">🔗 LinkedIn</button>` : ""}
          <div>
            <button class="icon-btn edit-btn" data-id="${a.id}" title="Edit">✏️</button>
            <button class="icon-btn delete-btn" data-id="${a.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `;
      alumniListEl.appendChild(card);
    });

    attachDynamicEvents(alumniList);
  }

  function attachDynamicEvents(alumniList) {
    document.querySelectorAll(".edit-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const alum = alumniList.find((x) => x.id === id);
        if (alum) editAlumni(alum);
      })
    );

    document.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (confirm("Delete this alumni?")) {
          await deleteDoc(doc(db, "alumni", id));
        }
      })
    );
  }

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

  addBtn.addEventListener("click", () => {
    saveBtn.textContent = "Add Alumni";
    form.reset();
    editId = null;
    openModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form));

    try {
      if (editId) {
        await updateDoc(doc(db, "alumni", editId), formData);
        alert("✅ Alumni updated successfully!");
      } else {
        await addDoc(collection(db, "alumni"), formData);
        alert("✅ Alumni added successfully!");
      }
      closeModal();
    } catch (err) {
      console.error("Error saving alumni:", err);
      alert("❌ Failed to save alumni.");
    }
  });

  function editAlumni(a) {
    form.name.value = a.name || "";
    form.batch.value = a.batch || "";
    form.role.value = a.role || "";
    form.company.value = a.company || "";
    form.cgpa.value = a.cgpa || "";
    form.exp.value = a.exp || "";
    form.linkedin.value = a.linkedin || "";
    form.advice.value = a.advice || "";
    form.photo.value = a.photo || "";

    editId = a.id;
    saveBtn.textContent = "Update Alumni";
    openModal(true);
  }
});
