import { db } from "../js/firebase-init.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const alumniGrid = document.getElementById("alumniGrid");
  const searchCompany = document.getElementById("searchCompany");
  const searchRole = document.getElementById("searchRole");

  let alumniList = [];

  onSnapshot(collection(db, "alumni"), (snapshot) => {
    alumniList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAlumni(alumniList);
  });

  function renderAlumni(list) {
    alumniGrid.innerHTML = "";

    if (!list.length) {
      alumniGrid.innerHTML = `<p class="muted" style="text-align:center;margin-top:20px;">No alumni found.</p>`;
      return;
    }

    list.forEach((a) => {
      const card = document.createElement("div");
      card.className = "alumni-card";
      card.innerHTML = `
        <img src="${a.photo || "https://i.imgur.com/fZ9xO1F.png"}" alt="${a.name}" class="alumni-photo">
        <h3>${a.name}</h3>
        <p><strong>${a.role}</strong> @ ${a.company}</p>
        <p><strong>Batch:</strong> ${a.batch}</p>
        <p><strong>Experience:</strong> ${a.exp || 0} yrs</p>
        <p><strong>CGPA:</strong> ${a.cgpa || "-"}</p>
        <p class="alumni-advice">"${a.advice || ""}"</p>
        ${
          a.linkedin
            ? `<button class="connect-btn" onclick="window.open('${a.linkedin}','_blank')">Connect on LinkedIn</button>`
            : ""
        }
      `;
      alumniGrid.appendChild(card);
    });
  }

  function applyFilters() {
    const cText = searchCompany.value.toLowerCase();
    const rText = searchRole.value.toLowerCase();

    const filtered = alumniList.filter(
      (a) =>
        (a.company || "").toLowerCase().includes(cText) &&
        (a.role || "").toLowerCase().includes(rText)
    );
    renderAlumni(filtered);
  }

  searchCompany.addEventListener("input", applyFilters);
  searchRole.addEventListener("input", applyFilters);
});
