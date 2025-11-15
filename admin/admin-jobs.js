// admin-jobs.js — FULL UPDATED VERSION (with round.mode support)

import { db } from "../js/firebase-init.js"; 
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const jobsRef = collection(db, "jobs");

function id() { return 'j_' + Math.random().toString(36).slice(2, 9); }
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

let jobs = [];

/* ==========================
   REALTIME JOB FETCH
========================== */
onSnapshot(
  jobsRef,
  (snapshot) => {
    console.log("Jobs snapshot received:", snapshot.size);
    jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderJobs();
  },
  (error) => {
    console.error("🔥 Firestore onSnapshot ERROR:", error);
    document.getElementById("jobsList").innerHTML =
      `<div class="error">Failed to load jobs: ${error.message}</div>`;
  }
);


/* ==========================
   RENDER JOB LIST
========================== */
function renderJobs(filterText = '', filterTag = 'all') {
  const list = document.getElementById("jobsList");
  list.innerHTML = "";

  const filtered = jobs.filter(j => {
    const txt = (j.company + ' ' + j.role + ' ' + j.location + ' ' + j.skills).toLowerCase();
    const okText = txt.includes(filterText.toLowerCase());
    const okTag =
      filterTag === 'all' ||
      (filterTag === 'open' && j.status === 'open') ||
      (filterTag === 'closed' && j.status === 'closed') ||
      (filterTag === 'dream' && /dream/i.test(j.category));
    return okText && okTag;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty">No jobs found</div>`;
    return;
  }

  filtered.forEach(job => {
    const li = el('li', 'job-item');
    const left = el('div', 'job-left');

    const title = el('div', 'job-title');
    title.textContent = job.role;

    const meta = el('div', 'job-meta');
    meta.innerHTML = `
      <span>${job.company}</span> • 
      <span>${job.location}</span> • 
      <strong style="color:var(--blue)">${job.package}</strong> • 
      <span>Deadline: ${job.deadline}</span>
    `;

    const badges = el('div', 'badges');
    const catBadge = el('span', 'badge ' + (job.category.toLowerCase().includes('dream') ? 'badge dream' : ''));
    catBadge.textContent = job.category;

    const statusBadge = el('span', 'badge ' + (job.status === 'open' ? 'badge open' : 'badge closed'));
    statusBadge.textContent = job.status === 'open' ? 'Open' : 'Closed';

    badges.appendChild(catBadge);
    badges.appendChild(statusBadge);

    left.append(title, meta, badges);

    const actions = el('div', 'job-actions');
    
    const viewBtn = el('button', 'icon-btn'); 
    viewBtn.innerHTML = '👁️';
    viewBtn.onclick = () => openViewModal(job);

    const editBtn = el('button', 'icon-btn'); 
    editBtn.innerHTML = '✏️';
    editBtn.onclick = () => openEditModal(job);

    const delBtn = el('button', 'icon-btn'); 
    delBtn.innerHTML = '🗑️';
    delBtn.onclick = async () => {
      if (!confirm("Delete this job?")) return;
      try { await deleteDoc(doc(db, "jobs", job.id)); }
      catch (err) { alert("Failed to delete: " + err.message); }
    };

    actions.append(viewBtn, editBtn, delBtn);
    li.append(left, actions);
    list.appendChild(li);
  });
}


/* ==========================
   ADD JOB
========================== */
document.getElementById('openAddJob').addEventListener('click', () => {
  document.getElementById('addJobForm').reset();
  document.getElementById('roundsList').innerHTML = '';
  openModal('addModal');
});

document.getElementById('addRoundBtn').addEventListener('click', () =>
  addRoundUI('roundsList')
);

document.getElementById('addJobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;

  const job = {
    company: f.company.value.trim(),
    role: f.role.value.trim(),
    location: f.location.value.trim(),
    package: f.package.value.trim(),
    type: f.type.value,
    category: f.category.value,
    deadline: f.deadline.value,
    link: f.link.value,
    skills: f.skills.value,
    eligibility: f.eligibility.value,
    description: f.description.value,
    requirements: f.requirements.value,
    benefits: f.benefits.value,
    status: "open",
    rounds: collectRoundsFrom('roundsList'),
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(jobsRef, job);
    closeModal('addModal');
  } catch (err) {
    alert("Failed to add job: " + err.message);
  }
});


/* ==========================
   EDIT JOB
========================== */
function openEditModal(job) {
  const f = document.getElementById('editJobForm');

  f.jobId.value = job.id;
  f.company.value = job.company;
  f.role.value = job.role;
  f.location.value = job.location;
  f.package.value = job.package;
  f.type.value = job.type;
  f.category.value = job.category;
  f.deadline.value = job.deadline;
  f.skills.value = job.skills;
  f.eligibility.value = job.eligibility;
  f.description.value = job.description;
  f.requirements.value = job.requirements;
  f.benefits.value = job.benefits;

  const list = document.getElementById('roundsListEdit');
  list.innerHTML = '';
  job.rounds?.forEach(r => createRoundItem(list, r));

  openModal('editModal');
}

document.getElementById('addRoundBtnEdit').addEventListener('click', () =>
  addRoundUI('roundsListEdit')
);

document.getElementById('editJobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;

  const jobRef = doc(db, "jobs", f.jobId.value);

  try {
    await updateDoc(jobRef, {
      company: f.company.value.trim(),
      role: f.role.value.trim(),
      location: f.location.value.trim(),
      package: f.package.value.trim(),
      type: f.type.value,
      category: f.category.value,
      deadline: f.deadline.value,
      skills: f.skills.value,
      eligibility: f.eligibility.value,
      description: f.description.value,
      requirements: f.requirements.value,
      benefits: f.benefits.value,
      rounds: collectRoundsFrom('roundsListEdit')
    });

    closeModal('editModal');
  } catch (err) {
    alert("Update failed: " + err.message);
  }
});


/* ==========================
   VIEW JOB
========================== */
function openViewModal(job) {
  const container = document.getElementById('jobDetails');
  container.innerHTML = `
    <h3>${job.role}</h3>
    <div class="job-detail-grid">
      <div>
        <div class="job-detail-row"><span class="label">Company</span>${job.company}</div>
        <div class="job-detail-row"><span class="label">Package</span>${job.package}</div>
        <div class="job-detail-row"><span class="label">Deadline</span>${job.deadline}</div>
      </div>
      <div>
        <div class="job-detail-row"><span class="label">Location</span>${job.location}</div>
        <div class="job-detail-row"><span class="label">Type</span>${job.type}</div>
        <div class="job-detail-row"><span class="label">Skills</span>${job.skills}</div>
      </div>
    </div>
    <div><strong>Eligibility</strong><p>${job.eligibility}</p></div>
    <div><strong>Description</strong><p>${job.description}</p></div>
    <div><strong>Requirements</strong><p>${job.requirements}</p></div>
    <div><strong>Benefits</strong><p>${job.benefits}</p></div>
  `;
  openModal('viewModal');
}


/* ==========================
   ROUNDS UI + MODE SUPPORT
========================== */
function addRoundUI(listId) {
  const list = document.getElementById(listId);
  const r = { id: id(), from: '', to: '', title: '', mode: 'tbd', note: '' };
  createRoundItem(list, r);
}

function createRoundItem(listEl, round) {
  const li = el("li", "round-item");
  const main = el("div", "round-main");

  const from = document.createElement("input");
  from.type = "date";
  from.value = round.from || "";

  const to = document.createElement("input");
  to.type = "date";
  to.value = round.to || "";

  const title = document.createElement("input");
  title.placeholder = "Round name";
  title.value = round.title || "";

  const mode = document.createElement("select");
  mode.innerHTML = `
    <option value="online">Online</option>
    <option value="offline">Offline</option>
    <option value="in-college">In-College</option>
    <option value="hybrid">Hybrid</option>
    <option value="tbd">TBD</option>
  `;
  mode.value = round.mode || "tbd";

  const note = document.createElement("input");
  note.placeholder = "Note";
  note.value = round.note || "";

  main.append(from, to, title, mode, note);
  li.append(main);

  const del = el("button", "btn small");
  del.textContent = "Remove";
  del.onclick = () => li.remove();
  li.append(del);

  listEl.append(li);
}

function collectRoundsFrom(listId) {
  const list = document.getElementById(listId);
  const out = [];

  if (!list) return out;

  [...list.children].forEach((li) => {
    const inputs = li.querySelectorAll("input, select");
    if (inputs.length >= 5) {
      const [from, to, title, mode, note] = inputs;

      out.push({
        id: id(),
        from: from.value,
        to: to.value,
        title: title.value,
        mode: mode.value,
        note: note.value,
      });
    }
  });

  return out;
}


/* ==========================
   MODAL UTILITIES
========================== */
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('click', (e) => {
  const close = e.target.closest('[data-close]');
  if (close) closeModal(close.getAttribute('data-close'));
});


/* ==========================
   FILTERS
========================== */
let currentFilter = 'all';

document.getElementById('filterInput')
  .addEventListener('input', e => renderJobs(e.target.value, currentFilter));

document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => {
    currentFilter = b.dataset.filter || 'all';
    document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderJobs(document.getElementById('filterInput').value, currentFilter);
  });
});
