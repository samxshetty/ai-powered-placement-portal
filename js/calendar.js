import { db } from "../js/firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const eventList = document.getElementById("eventList");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  const studentId = localStorage.getItem("activeUserId");
  if (!studentId) {
    window.location.href = "index.html";
    return;
  }

  let events = [];
  let applications = [];

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function fmt(dateStr) {
    if (!dateStr) return "TBD";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return dateFormatter.format(d);
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  }

  async function fetchApplications() {
    const appsSnap = await getDocs(
      query(collection(db, "applications"), where("studentId", "==", studentId))
    );
    const apps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    applications = apps;
    return apps;
  }

  async function fetchJob(jobId) {
    const ref = doc(db, "jobs", jobId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function convertRoundsToEvents(job, application) {
    if (!job?.rounds || !Array.isArray(job.rounds)) return [];

    return job.rounds.map((round) => {
      const start = parseDate(round.from);
      const end = parseDate(round.to);
      const now = new Date();
      let status = "upcoming";
      if (start && end) {
        if (now < start) status = "upcoming";
        else if (now > end) status = "past";
        else status = "ongoing";
      } else if (start) {
        status = now > start ? "past" : "upcoming";
      }

      return {
        id: `${job.id}_${round.id}`,
        title: `${job.company} — ${job.role} (${round.title})`,
        company: job.company,
        role: job.role,
        roundTitle: round.title,
        mode: (round.mode || job.mode || "TBD").toLowerCase(),
        note: round.note || "",
        dateFrom: round.from || null,
        dateTo: round.to || null,
        dateFromDisplay: fmt(round.from),
        dateToDisplay: fmt(round.to),
        appliedAt: application?.appliedAt || application?.appliedAt || null,
        status,
        rawStart: start,
        rawEnd: end,
        jobId: job.id,
      };
    });
  }

  function renderEvents(list) {
    eventList.innerHTML = "";

    if (!list || list.length === 0) {
      eventList.innerHTML = `
        <p class="muted" style="text-align:center;margin:20px;">No events found.</p>
      `;
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((ev) => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.dataset.status = ev.status;

      const modeClass = `mode-${ev.mode.replace(/\s+/g, "-")}`;

      card.innerHTML = `
        <div class="event-header">
          <h4 class="event-title">${ev.title}</h4>
          <div class="right-meta">
            <span class="badge ${modeClass}">${ev.mode}</span>
            <span class="status ${ev.status}">${ev.status}</span>
          </div>
        </div>

        <div class="event-details">
          <p><strong>From:</strong> ${ev.dateFromDisplay}</p>
          <p><strong>To:</strong> ${ev.dateToDisplay}</p>
          <p><strong>Note:</strong> ${ev.note || "—"}</p>
        </div>
      `;

      card.style.cursor = "pointer";
      card.addEventListener("click", () => openEventModal(ev));

      frag.appendChild(card);
    });

    eventList.appendChild(frag);
  }

  function searchEvents() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    if (!q) return events.slice();

    return events.filter((ev) =>
      (ev.company || "").toLowerCase().includes(q) ||
      (ev.role || "").toLowerCase().includes(q) ||
      (ev.roundTitle || "").toLowerCase().includes(q) ||
      (ev.mode || "").toLowerCase().includes(q)
    );
  }

  function sortEvents(list) {
    const mode = sortSelect?.value || "earliest";
    const compareDateFrom = (a, b) => {
      const A = a.rawStart ? a.rawStart.getTime() : Number.POSITIVE_INFINITY;
      const B = b.rawStart ? b.rawStart.getTime() : Number.POSITIVE_INFINITY;
      return A - B;
    };

    const compareApplied = (a, b) => {
      const A = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const B = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return B - A;
    };

    const out = list.slice(); 

    if (mode === "earliest") {
      out.sort(compareDateFrom);
    } else if (mode === "latest") {
      out.sort((a, b) => -compareDateFrom(a, b));
    } else if (mode === "recentlyApplied") {
      out.sort(compareApplied);
    }

    return out;
  }

  function refreshUI() {
    const filtered = searchEvents();
    const sorted = sortEvents(filtered);
    renderEvents(sorted);
  }

  function openEventModal(ev) {
    const existing = document.getElementById("eventDetailModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "eventDetailModal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width:640px;">
        <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0">${ev.roundTitle} — ${ev.company}</h3>
          <button id="closeEvModal" class="close" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" style="padding:12px 0;">
          <p><strong>Role:</strong> ${ev.role}</p>
          <p><strong>From:</strong> ${ev.dateFromDisplay}</p>
          <p><strong>To:</strong> ${ev.dateToDisplay}</p>
          <p><strong>Mode:</strong> ${ev.mode}</p>
          <p><strong>Status:</strong> ${ev.status}</p>
          <p><strong>Applied At:</strong> ${ev.appliedAt ? fmt(ev.appliedAt) : "—"}</p>
          <p><strong>Note:</strong> ${ev.note || "—"}</p>
        </div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
          <button id="closeEvModal2" class="btn btn-ghost">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("#closeEvModal, #closeEvModal2").forEach(btn =>
      btn.addEventListener("click", () => modal.remove())
    );

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  try {
    const apps = await fetchApplications();

    let eventData = [];

    for (const app of apps) {
      const job = await fetchJob(app.jobId);
      if (!job) continue;

      const evs = convertRoundsToEvents(job, app);
      eventData.push(...evs);
    }

    events = eventData;

    refreshUI();

    searchInput?.addEventListener("input", refreshUI);
    sortSelect?.addEventListener("change", refreshUI);
  } catch (err) {
    console.error("Calendar load error:", err);
    eventList.innerHTML = `<p class="muted" style="text-align:center;margin:20px;">Failed to load events.</p>`;
  }
});
