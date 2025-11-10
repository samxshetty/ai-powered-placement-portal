document.addEventListener("DOMContentLoaded", () => {
  const eventList = document.getElementById("eventList");
  const modal = document.getElementById("eventModal");
  const form = document.getElementById("eventForm");
  const modalTitle = document.getElementById("modalTitle");
  const saveBtn = document.getElementById("saveEventBtn");
  const openBtn = document.getElementById("openAddEvent");
  let editId = null;

  let events = JSON.parse(localStorage.getItem("events")) || [
    {
      id: 1,
      title: "Tech Talk: AI in Industry",
      date: "2025-12-15",
      time: "10:00",
      venue: "Seminar Hall A",
      host: "Dr. Ramesh Kumar",
      category: "Seminar",
      desc: "A comprehensive talk on AI applications in industry.",
      link: "https://forms.google.com/",
    },
    {
      id: 2,
      title: "Google Campus Drive",
      date: "2025-12-18",
      time: "09:00",
      venue: "Main Auditorium",
      host: "Google Recruitment Team",
      category: "Placement",
      desc: "Campus placement event for final year students.",
      link: "",
    },
  ];

  function renderEvents() {
    eventList.innerHTML = "";
    if (events.length === 0) {
      eventList.innerHTML = `<p class="empty">No events added yet.</p>`;
      return;
    }

    events.forEach((e) => {
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <div class="event-info">
          <h3>${e.title} <span class="badge">${e.category}</span></h3>
          <div class="event-meta">
            <strong>Date:</strong> ${e.date} ${e.time ? "at " + e.time : ""}<br>
            <strong>Venue:</strong> ${e.venue}<br>
            <strong>Host:</strong> ${e.host}
          </div>
        </div>
        <div class="event-actions">
          <button class="icon-btn edit-btn" data-id="${e.id}" title="Edit"><i data-lucide="edit-2"></i></button>
          <button class="icon-btn delete-btn" data-id="${e.id}" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      `;
      eventList.appendChild(card);
    });
    lucide.createIcons();
    attachEventListeners();
  }

  function attachEventListeners() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => editEvent(btn.dataset.id));
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteEvent(btn.dataset.id));
    });
  }

  function openModal(isEdit = false) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    modalTitle.textContent = isEdit ? "Edit Event" : "Add Event";
  }

  function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    form.reset();
    editId = null;
  }

  document.querySelectorAll("[data-close='eventModal']").forEach(btn =>
    btn.addEventListener("click", closeModal)
  );

  openBtn.addEventListener("click", () => {
    saveBtn.textContent = "Add Event";
    form.reset();
    openModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    if (editId) {
      const index = events.findIndex((x) => x.id == editId);
      events[index] = { id: editId, ...data };
    } else {
      events.push({ id: Date.now(), ...data });
    }

    localStorage.setItem("events", JSON.stringify(events));
    renderEvents();
    closeModal();
  });

  function editEvent(id) {
    const e = events.find((x) => x.id == id);
    Object.keys(e).forEach((key) => {
      if (form[key]) form[key].value = e[key];
    });
    editId = id;
    saveBtn.textContent = "Update Event";
    openModal(true);
  }

  function deleteEvent(id) {
    if (confirm("Delete this event?")) {
      events = events.filter((x) => x.id != id);
      localStorage.setItem("events", JSON.stringify(events));
      renderEvents();
    }
  }

  renderEvents();
});
