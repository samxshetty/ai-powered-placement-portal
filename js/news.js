// news.js — Live Firestore Integration for Student News
import { db } from "../js/firebase-init.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const newsFeed = document.getElementById("newsFeed");
  const filtersContainer = document.getElementById("filtersContainer");
  const trendingList = document.getElementById("trendingList");
  const categoryList = document.getElementById("categoryList");
  const quickLinks = document.getElementById("quickLinks");

  let NEWS = [];

  // 🔹 Fetch live news
  onSnapshot(collection(db, "news"), (snapshot) => {
    NEWS = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAll();
  });

  function formatDate(d) {
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString();
  }

  function renderFeed(list) {
    newsFeed.innerHTML = "";
    if (!list.length) {
      newsFeed.innerHTML = `<div class="news-card"><p class="muted">No news yet.</p></div>`;
      return;
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.forEach((n) => {
      const card = document.createElement("article");
      card.className = "news-card";
      card.innerHTML = `
        ${n.banner ? `<img src="${n.banner}" alt="banner" class="news-banner">` : ""}
        <div class="news-meta">
          <span>${formatDate(n.date)}</span> • <span>${n.category}</span>
        </div>
        <h3 class="news-title">${n.title}</h3>
        <p class="news-content">${n.content.slice(0, 200)}...</p>
        <p class="news-author">By ${n.author || "Admin"}</p>
      `;
      newsFeed.appendChild(card);
    });
  }

  function buildCategories(data) {
    const counts = {};
    data.forEach((item) => {
      const cat = item.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }

  function renderFilters(categories) {
    filtersContainer.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All";
    allBtn.dataset.cat = "All";
    filtersContainer.appendChild(allBtn);

    Object.keys(categories).forEach((cat) => {
      const b = document.createElement("button");
      b.className = "filter-btn";
      b.textContent = cat;
      b.dataset.cat = cat;
      filtersContainer.appendChild(b);
    });

    filtersContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      [...filtersContainer.querySelectorAll(".filter-btn")].forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      renderFeed(cat === "All" ? NEWS : NEWS.filter((n) => n.category === cat));
    });
  }

  function renderTrending(data) {
    trendingList.innerHTML = "";
    const top = data.slice(0, 5);
    top.forEach((n) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${n.title}</strong><small>${formatDate(n.date)}</small>`;
      trendingList.appendChild(li);
    });
  }

  function renderQuickLinks() {
    quickLinks.innerHTML = `
      <li><a href="#">Placement Brochure</a></li>
      <li><a href="#">Company Profiles</a></li>
      <li><a href="#">Placement FAQs</a></li>
    `;
  }

  function renderCategoryCounts(counts) {
    categoryList.innerHTML = "";
    Object.keys(counts).forEach((cat) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${cat}</span><span class="category-pill">${counts[cat]}</span>`;
      li.addEventListener("click", () => {
        const btn = [...filtersContainer.querySelectorAll(".filter-btn")].find((b) => b.dataset.cat === cat);
        if (btn) btn.click();
      });
      categoryList.appendChild(li);
    });
  }

  function renderAll() {
    const categories = buildCategories(NEWS);
    renderFilters(categories);
    renderFeed(NEWS);
    renderTrending(NEWS);
    renderQuickLinks();
    renderCategoryCounts(categories);
  }
});
