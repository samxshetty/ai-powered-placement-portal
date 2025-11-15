import { db } from "../js/firebase-init.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const recentListEl = document.getElementById("recentActivity");
const topTitleEl = document.getElementById("topRoleTitle");
const topAppsEl = document.getElementById("topRoleApps");
const topProgressEl = document.getElementById("roleProgress");
const totalJobsEl = document.getElementById("totalJobs");
const activeStudentsEl = document.getElementById("activeStudents");
const upcomingEventsEl = document.getElementById("upcomingEvents");

let applications = []; 
let jobs = [];         
let students = [];    
let events = [];      

function parseTS(ts) {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  if (isNaN(d)) return new Date(0);
  return d;
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function safeText(s) { return (s === undefined || s === null) ? "" : String(s); }

function buildAndRenderActivities() {
  const acts = [];

  applications.forEach(app => {
    const ts = parseTS(app.appliedAt || app.createdAt || app.timestamp);
    acts.push({
      ts,
      type: "application",
      title: `${safeText(app.studentName)} applied for ${safeText(app.jobRole)} @ ${safeText(app.jobCompany)}`,
      subtitle: safeText(app.studentId) === safeText(app.studentId) ? "Application received" : "Application",
      link: "#",
      color: "#3b82f6"
    });
  });


  jobs.forEach(job => {
    const created = parseTS(job.createdAt);
    const updated = parseTS(job.updatedAt || job.lastUpdatedAt);
    acts.push({
      ts: created,
      type: "job-created",
      title: `Job posted: ${safeText(job.role)} @ ${safeText(job.company)}`,
      subtitle: "New job posted",
      link: "#",
      color: "#eab308"
    });
    if (updated.getTime() > created.getTime()) {
      acts.push({
        ts: updated,
        type: "job-updated",
        title: `Job updated: ${safeText(job.role)} @ ${safeText(job.company)}`,
        subtitle: "Job updated",
        link: "#",
        color: "#f97316"
      });
    }
  });

  events.forEach(ev => {
    const created = parseTS(ev.createdAt || ev.date || ev.startAt);
    acts.push({
      ts: created,
      type: "event",
      title: `Event: ${safeText(ev.title || ev.role || ev.name)}`,
      subtitle: safeText(ev.location) || "Event",
      link: "#",
      color: "#22c55e"
    });
  });

  students.forEach(s => {
    const updated = parseTS(s.updatedAt || s.lastUpdatedAt || s.createdAt);
    acts.push({
      ts: updated,
      type: "student-update",
      title: `Profile: ${safeText(s.name)} (${safeText(s.usn)})`,
      subtitle: "Profile updated",
      link: "#",
      color: "#8b5cf6"
    });
  });

  acts.sort((a, b) => b.ts - a.ts);

  const top = acts.slice(0, 20);

  recentListEl.innerHTML = top.map(a => {
    const t = timeAgo(a.ts);
    const subtitle = a.subtitle ? `<div class="activity-sub">${a.subtitle}</div>` : "";
    return `
      <li class="activity-item">
        <div class="activity-dot" style="background:${a.color}"></div>
        <div class="activity-body">
          <div class="activity-title">${a.title}</div>
          ${subtitle}
        </div>
        <div class="activity-time">${t}</div>
      </li>
    `;
  }).join("");
}

function computeTopAppliedRole() {
  const counts = {};
  applications.forEach(a => {
    const jid = a.jobId;
    if (!jid) return;
    counts[jid] = (counts[jid] || 0) + 1;
  });

  if (Object.keys(counts).length === 0) {
    jobs.forEach(j => {
      const cnt = Array.isArray(j.applicants) ? j.applicants.length : (j.applicantsCount || 0);
      if (cnt) counts[j.id || j.jobId] = cnt;
    });
  }

  let topJobId = null;
  let max = 0;
  Object.entries(counts).forEach(([jid, c]) => {
    if (c > max) {
      max = c;
      topJobId = jid;
    }
  });

  if (!topJobId) {
    topTitleEl.textContent = "No applications yet";
    topAppsEl.textContent = "0";
    topProgressEl.style.width = "0%";
    return;
  }

  const jobDoc = jobs.find(j => j.id === topJobId || j.jobId === topJobId);
  const label = jobDoc ? `${jobDoc.role} @ ${jobDoc.company}` : topJobId;
  topTitleEl.textContent = label;
  topAppsEl.textContent = String(max);

  const maxCount = Math.max(...Object.values(counts));
  topProgressEl.style.width = `${Math.round((max / Math.max(1, maxCount)) * 100)}%`;
}

function updateStats() {
  totalJobsEl.textContent = String(jobs.length || 0);
  activeStudentsEl.textContent = String(students.length || 0);
  upcomingEventsEl.textContent = String(events.length || 0);
}


try {
  const qApps = query(collection(db, "applications"), /* orderBy fallback handled by timestamps */);
  onSnapshot(qApps, (snap) => {
    applications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    buildAndRenderActivities();
    computeTopAppliedRole();
  }, (err) => {
    console.error("applications snapshot error:", err);
  });
} catch (e) {
  console.error("applications listener setup failed:", e);
}

try {
  onSnapshot(collection(db, "jobs"), (snap) => {
    jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    computeTopAppliedRole();
    buildAndRenderActivities();
  }, (err) => {
    console.error("jobs snapshot error:", err);
  });
} catch (e) {
  console.error("jobs listener setup failed:", e);
}

try {
  onSnapshot(collection(db, "events"), (snap) => {
    events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    buildAndRenderActivities();
  }, (err) => {
    console.error("events snapshot error:", err);
  });
} catch (e) {
  console.error("events listener setup failed:", e);
}

try {
  onSnapshot(collection(db, "students"), (snap) => {
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    buildAndRenderActivities();
  }, (err) => {
    console.error("students snapshot error:", err);
  });
} catch (e) {
  console.error("students listener setup failed:", e);
}
