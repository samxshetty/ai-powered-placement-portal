// js/news.js
document.addEventListener("DOMContentLoaded", () => {
  const NEWS = window.__PLACEMENTHUB_NEWS || [];
  const newsFeed = document.getElementById("newsFeed");
  const filtersContainer = document.getElementById("filtersContainer");
  const trendingList = document.getElementById("trendingList");
  const categoryList = document.getElementById("categoryList");
  const quickLinks = document.getElementById("quickLinks");

  // Helper: format date
  function formatDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString();
  }

  // Build categories and counts
  function buildCategories(data) {
    const counts = {};
    data.forEach(item => {
      const c = item.category || "Other";
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }

  // Render filters (All + categories)
  function renderFilters(categories) {
    filtersContainer.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All";
    allBtn.dataset.cat = "All";
    filtersContainer.appendChild(allBtn);

    Object.keys(categories).forEach(cat => {
      const b = document.createElement("button");
      b.className = "filter-btn";
      b.textContent = cat;
      b.dataset.cat = cat;
      filtersContainer.appendChild(b);
    });

    // click handler for filters
    filtersContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      [...filtersContainer.querySelectorAll(".filter-btn")].forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      renderFeed(cat === "All" ? NEWS : NEWS.filter(n => n.category === cat));
    });
  }

  // Render News Feed
  function renderFeed(list) {
    newsFeed.innerHTML = "";
    if (!list.length) {
      newsFeed.innerHTML = `<div class="news-card"><p class="muted">No announcements found.</p></div>`;
      return;
    }

    list.sort((a,b) => new Date(b.date) - new Date(a.date));
    list.forEach(item => {
      const card = document.createElement("article");
      card.className = "news-card";
      card.id = `news_${item.id}`;

      card.innerHTML = `
        <div class="card-top">
          <div>
            <div class="news-title">${escapeHtml(item.title)}</div>
            <div class="news-meta"><span>📅 ${formatDate(item.date)}</span> <span>•</span> <span class="muted">${escapeHtml(item.category)}</span></div>
          </div>
          <div>
            <span class="badge ${escapeHtml(item.category)}">${escapeHtml(item.category)}</span>
          </div>
        </div>

        <div class="news-desc" data-collapsed="true">${escapeHtml(item.preview || item.body || "")}</div>

        <button class="read-more" aria-expanded="false">Read more</button>
      `;

      // append and then set longer body if available (preview handled)
      newsFeed.appendChild(card);

      const desc = card.querySelector(".news-desc");
      const readMoreBtn = card.querySelector(".read-more");

      // If body exists and is longer than preview, show combined preview + small body? We'll allow expansion to full body
      if (item.body && item.body.length > (item.preview || "").length) {
        // on read more, replace content with full body
        readMoreBtn.addEventListener("click", () => {
          const expanded = desc.classList.toggle("expanded");
          readMoreBtn.textContent = expanded ? "Read less" : "Read more";
          readMoreBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
          // replace with body on expand, revert to preview on collapse
          if (expanded) desc.textContent = item.body;
          else desc.textContent = item.preview || item.body;
          // smooth scroll the opened card into view a bit
          if (expanded) card.scrollIntoView({behavior: "smooth", block: "center"});
        });
      } else {
        // no longer body; hide read more if content short
        if ((item.preview||"").length < 220) {
          readMoreBtn.style.display = "none";
        } else {
          // if preview long but no separate body, toggle expanded/collapsed to show more of it
          readMoreBtn.addEventListener("click", () => {
            const expanded = desc.classList.toggle("expanded");
            readMoreBtn.textContent = expanded ? "Read less" : "Read more";
            readMoreBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
            if (expanded) card.scrollIntoView({behavior: "smooth", block: "center"});
          });
        }
      }
    });
  }

  // Escape html to avoid injection
  function escapeHtml(s) {
    if (!s && s !== 0) return "";
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }

  // Render trending (based on trendingScore or recent date)
  function renderTrending(data) {
    trendingList.innerHTML = "";
    // sort by trendingScore then date
    const top = data.slice().sort((a,b) => (b.trendingScore||0) - (a.trendingScore||0) || (new Date(b.date) - new Date(a.date))).slice(0,5);
    top.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(item.title)}</strong><small>${formatDate(item.date)}</small>`;
      li.addEventListener("click", () => {
        const card = document.getElementById(`news_${item.id}`);
        if (card) card.scrollIntoView({behavior:"smooth", block:"center"});
        // also briefly highlight
        card && card.animate([{boxShadow:"0 0 0 0 rgba(37,99,235,0.0)"},{boxShadow:"0 8px 28px rgba(37,99,235,0.08)"}], {duration:600});
      });
      trendingList.appendChild(li);
    });
  }

  // Quick links (static defaults or generate from categories)
  function renderQuickLinks() {
    const defaults = [
      { title: "Placement Brochure 2024", href: "#" },
      { title: "Company Profiles", href: "#" },
      { title: "Past Year Statistics", href: "#" },
      { title: "Placement FAQs", href: "#" }
    ];
    quickLinks.innerHTML = "";
    defaults.forEach(d => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${d.href}">${escapeHtml(d.title)}</a>`;
      quickLinks.appendChild(li);
    });
  }

  // Render category counts
  function renderCategoryCounts(counts) {
    categoryList.innerHTML = "";
    Object.keys(counts).forEach(cat => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(cat)}</span><span class="category-pill">${counts[cat]}</span>`;
      li.addEventListener("click", () => {
        // trigger filter button with this category
        const btn = [...filtersContainer.querySelectorAll(".filter-btn")].find(b => b.dataset.cat === cat);
        if (btn) btn.click();
      });
      categoryList.appendChild(li);
    });
  }

  // initial render
  const categories = buildCategories(NEWS);
  renderFilters(categories);
  renderFeed(NEWS);
  renderTrending(NEWS);
  renderQuickLinks();
  renderCategoryCounts(categories);
});
