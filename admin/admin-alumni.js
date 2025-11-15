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
  let currentAlumni = []; // Always holds latest snapshot data

  // 🟦 SINGLE Firestore listener
  onSnapshot(collection(db, "alumni"), (snapshot) => {
    console.log("🔥 Firestore snapshot received:", snapshot.size);

    currentAlumni = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    renderAlumni(currentAlumni);
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
              : `${a.name?.[0] || ""}${a.name?.split(" ")[1]?.[0] || ""}`}
          </div>
          <div class="alumni-info">
            <h3>${a.name}</h3>
            <p>Batch ${a.batch}</p>
          </div>
        </div>

        <div class="alumni-company">${a.role || ""}</div>
        <div class="alumni-meta">
          ${a.company || ""}<br>
          CGPA: ${a.cgpa || "-"} • ${a.exp || 0} yrs exp
        </div>
        <div class="alumni-advice">"${a.advice || ""}"</div>

        <div class="alumni-actions">
          ${
            a.linkedin
              ? `<button class="linkedin-btn" data-link="${a.linkedin}">🔗 LinkedIn</button>`
              : ""
          }
          <div>
            <button class="icon-btn edit-btn" data-id="${a.id}" title="Edit">✏️</button>
            <button class="icon-btn delete-btn" data-id="${a.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `;
      alumniListEl.appendChild(card);
    });
  }

  // 🟦 EVENT DELEGATION — ZERO duplicated listeners
  alumniListEl.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    const linkedinBtn = e.target.closest(".linkedin-btn");

    if (editBtn) {
      const id = editBtn.dataset.id;
      const alum = currentAlumni.find((x) => x.id === id);
      if (alum) editAlumni(alum);
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (confirm("Delete this alumni?")) {
        await deleteDoc(doc(db, "alumni", id));
      }
      return;
    }

    if (linkedinBtn) {
      window.open(linkedinBtn.dataset.link, "_blank");
    }
  });

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

  document
    .querySelectorAll("[data-close='alumniModal']")
    .forEach((btn) => btn.addEventListener("click", closeModal));

  addBtn.addEventListener("click", () => {
    saveBtn.textContent = "Add Alumni";
    form.reset();
    editId = null;
    openModal();
  });

  // 🟦 Add / Update alumni
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
