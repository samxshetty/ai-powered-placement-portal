// jobs.js - client-side jobs CRUD with rounds (no backend)

const jobsKey = "__admin_jobs_demo_v1";

// simple demo initial data
let jobs = [
  {
    id: id(),
    company: "Google",
    role: "Software Engineer",
    location: "Bangalore",
    package: "28 LPA",
    type: "Full-time",
    category: "Super Dream",
    deadline: "2025-12-15",
    skills: "React, Node.js, TypeScript",
    eligibility: "CGPA > 7.5, No active backlogs",
    description: "Join Google's engineering team to build cutting-edge solutions.",
    requirements: "Good DS & system design",
    benefits: "Health insurance, Stock options",
    status: "open",
    rounds: [
      { id: id(), from: "2025-12-01", to: "2025-12-01", title: "Aptitude", note: "30 min online test" },
      { id: id(), from: "2025-12-05", to: "2025-12-05", title: "Technical Round", note: "Coding + System Design" }
    ]
  },
  {
    id: id(),
    company: "Microsoft",
    role: "Product Manager",
    location: "Hyderabad",
    package: "32 LPA",
    type: "Full-time",
    category: "Super Dream",
    deadline: "2025-12-20",
    skills: "Product, Analytics",
    eligibility: "CGPA > 8.0",
    description: "Lead product initiatives...",
    requirements: "Prior internship",
    benefits: "Bonus + stock",
    status: "open",
    rounds: [
      { id: id(), from: "2025-12-03", to: "2025-12-03", title: "HR Round", note: "Behavioral" }
    ]
  }
];

// persist/load
function save() {
  localStorage.setItem(jobsKey, JSON.stringify(jobs));
}
function load() {
  const raw = localStorage.getItem(jobsKey);
  if (raw) jobs = JSON.parse(raw);
}

// helpers
function id() { return 'j_' + Math.random().toString(36).slice(2,9); }
function el(tag, cls) { const e=document.createElement(tag); if(cls) e.className=cls; return e; }

// mount list
function renderJobs(filterText='', filterTag='all') {
  const list = document.getElementById("jobsList");
  list.innerHTML = '';

  const filtered = jobs.filter(j => {
    const txt = (j.company + ' ' + j.role + ' ' + j.location + ' ' + j.skills).toLowerCase();
    const okText = txt.includes(filterText.toLowerCase());
    const okTag = (filterTag === 'all') || (filterTag === 'open' && j.status === 'open') || (filterTag === 'closed' && j.status === 'closed') || (filterTag === 'dream' && /dream/i.test(j.category));
    return okText && okTag;
  });

  filtered.forEach(job => {
    const li = el('li','job-item');
    const left = el('div','job-left');
    const title = el('div','job-title'); title.textContent = job.role;
    const meta = el('div','job-meta');

    const company = el('span'); company.textContent = job.company;
    const dot = el('span'); dot.textContent = '•';
    const loc = el('span'); loc.textContent = job.location;
    const pack = el('span'); pack.innerHTML = `<strong style="color:var(--blue)">${job.package}</strong>`;
    const dl = el('span'); dl.textContent = 'Deadline: ' + job.deadline;

    meta.appendChild(company);
    meta.appendChild(dot);
    meta.appendChild(loc);
    meta.appendChild(pack);
    meta.appendChild(dl);

    const badges = el('div','badges');
    const catBadge = el('span','badge ' + (job.category.toLowerCase().includes('dream') ? 'badge dream' : ''));
    catBadge.textContent = job.category;
    const statusBadge = el('span','badge ' + (job.status === 'open' ? 'badge open' : 'badge closed'));
    statusBadge.textContent = job.status === 'open' ? 'Open' : 'Closed';
    badges.appendChild(catBadge);
    badges.appendChild(statusBadge);

    left.appendChild(title);
    left.appendChild(meta);
    left.appendChild(badges);

    const actions = el('div','job-actions');
    const viewBtn = el('button','icon-btn'); viewBtn.innerHTML = '👁️';
    viewBtn.addEventListener('click',()=> openViewModal(job.id));
    const editBtn = el('button','icon-btn'); editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click',()=> openEditModal(job.id));
    const delBtn = el('button','icon-btn'); delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click',()=> { if(confirm('Delete this job?')) { jobs = jobs.filter(x=>x.id!==job.id); save(); renderJobs(); } });

    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

// open/close modals
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.addEventListener('click', (e)=>{
  const close = e.target.closest('[data-close]');
  if (close) {
    const id = close.getAttribute('data-close');
    closeModal(id);
  }
});

// ADD job handling
document.getElementById('openAddJob').addEventListener('click', ()=>{
  // reset form
  document.getElementById('addJobForm').reset();
  document.getElementById('roundsList').innerHTML = '';
  openModal('addModal');
});

document.getElementById('addRoundBtn').addEventListener('click', ()=> {
  addRoundUI('roundsList');
});

document.getElementById('addJobForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = e.target;
  const job = {
    id: id(),
    company: f.company.value.trim(),
    role: f.role.value.trim(),
    location: f.location.value.trim(),
    package: f.package.value.trim(),
    type: f.type.value,
    category: f.category.value,
    deadline: f.deadline.value || '',
    skills: f.skills.value,
    eligibility: f.eligibility.value,
    description: f.description.value,
    requirements: f.requirements.value,
    benefits: f.benefits.value,
    status: 'open',
    rounds: collectRoundsFrom('roundsList')
  };
  jobs.unshift(job);
  save();
  renderJobs();
  closeModal('addModal');
});

// EDIT handling
function openEditModal(jobId) {
  const job = jobs.find(j=>j.id===jobId);
  if(!job) return alert('Job not found');
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

  // populate rounds
  const list = document.getElementById('roundsListEdit');
  list.innerHTML = '';
  job.rounds.forEach(r => createRoundItem(list, r));

  openModal('editModal');
}

document.getElementById('addRoundBtnEdit').addEventListener('click', ()=> addRoundUI('roundsListEdit'));

document.getElementById('editJobForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = e.target;
  const jobId = f.jobId.value;
  const idx = jobs.findIndex(j=>j.id===jobId);
  if(idx<0) return alert('Job not found');
  jobs[idx] = {
    ...jobs[idx],
    company: f.company.value.trim(),
    role: f.role.value.trim(),
    location: f.location.value.trim(),
    package: f.package.value.trim(),
    type: f.type.value,
    category: f.category.value,
    deadline: f.deadline.value || '',
    skills: f.skills.value,
    eligibility: f.eligibility.value,
    description: f.description.value,
    requirements: f.requirements.value,
    benefits: f.benefits.value,
    rounds: collectRoundsFrom('roundsListEdit')
  };
  save();
  renderJobs();
  closeModal('editModal');
});

// VIEW details
function openViewModal(jobId) {
  const job = jobs.find(j=>j.id===jobId);
  if(!job) return;
  const container = document.getElementById('jobDetails');
  container.innerHTML = ''; // build details
  const title = el('h3'); title.textContent = job.role;
  const meta = el('div'); meta.className='job-detail-grid';
  const left = el('div');
  left.innerHTML = `<div class="job-detail-row"><span class="label">Company</span>${job.company || '-'}</div>
                    <div class="job-detail-row"><span class="label">Package</span>${job.package || '-'}</div>
                    <div class="job-detail-row"><span class="label">Deadline</span>${job.deadline || '-'}</div>`;
  const right = el('div');
  right.innerHTML = `<div class="job-detail-row"><span class="label">Location</span>${job.location || '-'}</div>
                     <div class="job-detail-row"><span class="label">Type</span>${job.type || '-'}</div>
                     <div class="job-detail-row"><span class="label">Skills</span>${job.skills || '-'}</div>`;
  meta.appendChild(left); meta.appendChild(right);

  const eligibility = el('div'); eligibility.innerHTML = `<strong>Eligibility Criteria</strong><p>${job.eligibility || '-'}</p>`;
  const desc = el('div'); desc.innerHTML = `<strong>Job Description</strong><p>${job.description || '-'}</p>`;
  const req = el('div'); req.innerHTML = `<strong>Requirements</strong><p>${job.requirements || '-'}</p>`;
  const ben = el('div'); ben.innerHTML = `<strong>Benefits</strong><p>${job.benefits || '-'}</p>`;

  // rounds
  const roundsWrap = el('div'); roundsWrap.innerHTML = `<strong>Interview Rounds</strong>`;
  const rlist = el('ul'); rlist.style.listStyle='none'; rlist.style.padding='0';
  job.rounds.forEach(r=>{
    const ri = el('li'); ri.style.padding='8px 0'; ri.innerHTML = `<div style="font-weight:700">${r.title}</div>
      <div style="color:var(--muted);font-size:13px">${r.from} — ${r.to}</div>
      <div style="margin-top:6px">${r.note || ''}</div>`;
    rlist.appendChild(ri);
  });
  roundsWrap.appendChild(rlist);

  container.appendChild(title);
  container.appendChild(meta);
  container.appendChild(eligibility);
  container.appendChild(desc);
  container.appendChild(req);
  container.appendChild(ben);
  container.appendChild(roundsWrap);

  openModal('viewModal');
}

// rounds UI helpers
function addRoundUI(listId) {
  const list = document.getElementById(listId);
  const r = {
    id: id(),
    from: '',
    to: '',
    title: '',
    note: ''
  };
  createRoundItem(list, r, true);
}

function createRoundItem(listEl, round, editable=true) {
  const li = el('li','round-item');
  const main = el('div','round-main');
  const from = document.createElement('input'); from.type='date'; from.value = round.from || ''; from.style.width='140px';
  const to = document.createElement('input'); to.type='date'; to.value = round.to || ''; to.style.width='140px';
  const title = document.createElement('input'); title.placeholder='Round name (e.g. Technical)'; title.value = round.title || '';
  const note = document.createElement('input'); note.placeholder='Note'; note.value = round.note || '';

  main.appendChild(from); main.appendChild(to); main.appendChild(title); main.appendChild(note);
  li.appendChild(main);
  const del = el('button','btn small'); del.textContent='Remove';
  del.addEventListener('click', ()=> li.remove());
  li.appendChild(del);
  listEl.appendChild(li);
}

function collectRoundsFrom(listId) {
  const list = document.getElementById(listId);
  const out = [];
  if (!list) return out;
  [...list.children].forEach(li => {
    const inputs = li.querySelectorAll('input');
    if (inputs.length >= 4) {
      const [from, to, title, note] = inputs;
      out.push({ id: id(), from: from.value, to: to.value, title: title.value, note: note.value });
    }
  });
  return out;
}

// filters & search
document.getElementById('filterInput').addEventListener('input', (e)=>{
  renderJobs(e.target.value || '', currentFilter);
});
document.querySelectorAll('.filter-btn').forEach(b=>{
  b.addEventListener('click', (ev)=>{
    currentFilter = b.dataset.filter || 'all';
    document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderJobs(document.getElementById('filterInput').value || '', currentFilter);
  });
});

let currentFilter = 'all';

// load / init
load();
renderJobs();

// expose some helpers for console dev
window.__jobs = jobs;
window.__saveJobs = ()=>{ save(); renderJobs(); };
