document.addEventListener("DOMContentLoaded", () => {
  const newsList = document.getElementById("newsList");
  const newsModal = document.getElementById("newsModal");
  const newsForm = document.getElementById("newsForm");
  const modalTitle = document.getElementById("modalTitle");
  const openAddNews = document.getElementById("openAddNews");
  const saveBtn = document.getElementById("saveNewsBtn");

  let editingId = null;

  let newsData = [
    {
      id: 1,
      title: "NMAMIT Students Achieve 95% Placement Rate",
      category: "Achievement",
      date: "2025-11-15",
      author: "Placement Office",
      content:
        "The 2025 batch has achieved an outstanding 95% placement rate with top companies like Google, Microsoft, and Amazon recruiting from campus.",
    },
    {
      id: 2,
      title: "New Scholarship Program Announced",
      category: "Announcement",
      date: "2025-11-10",
      author: "Admin",
      content:
        "Merit-based scholarship program for students with CGPA above 8.5 has been announced. Applications open from December 1st.",
    },
  ];

  // ===== Render News =====
  function renderNews() {
    newsList.innerHTML = "";
    newsData.forEach((news) => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.innerHTML = `
        <div class="news-meta">
          <span class="badge ${news.category}">${news.category}</span>
          <span class="news-date">${news.date}</span>
        </div>
        <div class="news-title">${news.title}</div>
        <div class="news-desc">${news.content}</div>
        <div class="news-author">By ${news.author}</div>
        <div class="actions">
          <button class="action-btn edit" data-action="edit" data-id="${news.id}">✏️ Edit</button>
          <button class="action-btn delete" data-action="delete" data-id="${news.id}">🗑️ Delete</button>
        </div>
      `;
      newsList.appendChild(card);
    });
  }

  // ===== Modal Controls =====
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

  // ===== Add News =====
  openAddNews.addEventListener("click", () => {
    newsForm.reset();
    editingId = null;
    saveBtn.textContent = "Add News";
    openModal(false);
  });

  // ===== Edit News =====
  function editNews(id) {
    const item = newsData.find((n) => n.id === id);
    if (!item) return;
    editingId = id;
    Object.entries(item).forEach(([key, value]) => {
      if (newsForm.elements[key]) newsForm.elements[key].value = value;
    });
    saveBtn.textContent = "Update News";
    openModal(true);
  }

  // ===== Delete News =====
  function deleteNews(id) {
    if (!confirm("Delete this news article?")) return;
    newsData = newsData.filter((n) => n.id !== id);
    renderNews();
  }

  // ===== Form Submit =====
  newsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(newsForm).entries());
    if (editingId) {
      const idx = newsData.findIndex((n) => n.id === editingId);
      newsData[idx] = { id: editingId, ...data };
    } else {
      newsData.push({ id: Date.now(), ...data });
    }
    renderNews();
    closeModal();
  });

  // ===== Delegated Button Clicks =====
  newsList.addEventListener("click", (e) => {
    const btn = e.target.closest("button.action-btn");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);
    if (action === "edit") return editNews(id);
    if (action === "delete") return deleteNews(id);
  });

  // Initial Render
  renderNews();
});
