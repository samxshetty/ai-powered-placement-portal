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
  const newsList = document.getElementById("newsList");
  const newsModal = document.getElementById("newsModal");
  const newsForm = document.getElementById("newsForm");
  const modalTitle = document.getElementById("modalTitle");
  const openAddNews = document.getElementById("openAddNews");
  const saveBtn = document.getElementById("saveNewsBtn");

  let editingId = null;

  onSnapshot(collection(db, "news"), (snapshot) => {
    const allNews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderNews(allNews);
  });

  function renderNews(list) {
    newsList.innerHTML = "";

    if (!list.length) {
      newsList.innerHTML = `<p class="empty">No news articles found.</p>`;
      return;
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.forEach((n) => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.innerHTML = `
        ${n.banner ? `<img src="${n.banner}" alt="banner" class="news-banner">` : ""}
        <div class="news-meta">
          <span class="badge ${n.category}">${n.category}</span>
          <span class="news-date">${n.date}</span>
        </div>
        <div class="news-title">${n.title}</div>
        <div class="news-desc">${n.content.slice(0, 120)}...</div>
        <div class="news-author">By ${n.author || "Admin"}</div>

        <div class="actions">
          <button class="action-btn edit" data-id="${n.id}">✏️ Edit</button>
          <button class="action-btn delete" data-id="${n.id}">🗑️ Delete</button>
        </div>
      `;
      newsList.appendChild(card);
    });

    attachEvents(list);
  }

  function attachEvents(list) {
    newsList.querySelectorAll(".edit").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const news = list.find((n) => n.id === id);
        if (news) editNews(news);
      })
    );

    newsList.querySelectorAll(".delete").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (confirm("Are you sure you want to delete this news article?")) {
          await deleteDoc(doc(db, "news", id));
        }
      })
    );
  }

  function openModal(isEdit = false) {
    newsModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    modalTitle.textContent = isEdit ? "Edit News Article" : "Add News Article";
  }

  function closeModal() {
    newsModal.classList.add("hidden");
    document.body.style.overflow = "";
    newsForm.reset();
    editingId = null;
  }

  document.querySelectorAll("[data-close='newsModal']").forEach((btn) =>
    btn.addEventListener("click", closeModal)
  );

  openAddNews.addEventListener("click", () => {
    newsForm.reset();
    editingId = null;
    saveBtn.textContent = "Add News";
    openModal();
  });

  newsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(newsForm);
    formData.delete("id");


    const data = Object.fromEntries(formData.entries());

    try {
      if (editingId) {
        await updateDoc(doc(db, "news", editingId), data);
        alert("✅ News updated successfully!");
      } else {
        await addDoc(collection(db, "news"), { ...data, createdAt: new Date().toISOString() });
        alert("✅ News added successfully!");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving news:", error);
      alert("❌ Failed to save news article.");
    }
  });

  function editNews(item) {
    Object.keys(item).forEach((key) => {
      if (newsForm.elements[key]) newsForm.elements[key].value = item[key];
    });
    editingId = item.id;
    saveBtn.textContent = "Update News";
    openModal(true);
  }
});
