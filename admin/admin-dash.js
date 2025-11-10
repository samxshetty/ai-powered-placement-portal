document.addEventListener("DOMContentLoaded", () => {
  // === Load Job Data ===
  let jobs = JSON.parse(localStorage.getItem("jobData")) || [
    {
      id: 1,
      role: "Software Engineer",
      company: "Google",
      location: "Bangalore",
      salary: "28 LPA",
      status: "Open",
      applications: 48,
      type: "Full-time",
    },
    {
      id: 2,
      role: "Product Manager",
      company: "Microsoft",
      location: "Hyderabad",
      salary: "32 LPA",
      status: "Open",
      applications: 34,
      type: "Full-time",
    },
    {
      id: 3,
      role: "Data Analyst",
      company: "TCS",
      location: "Mumbai",
      salary: "25 LPA",
      status: "Open",
      applications: 32,
      type: "Dream",
    },
  ];

  // === Load Student & Event Data (Dummy) ===
  const students = JSON.parse(localStorage.getItem("studentData")) || [];
  const events = JSON.parse(localStorage.getItem("eventData")) || [];

  // === Stats Section ===
  document.getElementById("totalJobs").textContent = jobs.length;
  document.getElementById("jobChange").textContent = "+12.5%";

  document.getElementById("activeStudents").textContent = students.length
    ? students.filter((s) => s.status === "Active").length
    : 1284;
  document.getElementById("studentChange").textContent = "+8.2%";

  document.getElementById("upcomingEvents").textContent = events.length || 8;
  document.getElementById("eventChange").textContent = "+3";

  document.getElementById("placementRate").textContent = "87%";
  document.getElementById("placementChange").textContent = "+5.1%";

  // === Dynamic Top Role Analytics ===
  const topRoleCard = {
    titleEl: document.getElementById("topRoleTitle"),
    appsEl: document.getElementById("topRoleApps"),
    progressEl: document.getElementById("roleProgress"),
  };

  if (jobs.length > 0) {
    const maxApps = Math.max(...jobs.map((j) => j.applications));
    const topJob = jobs.find((j) => j.applications === maxApps);

    topRoleCard.titleEl.textContent = `${topJob.role} @ ${topJob.company}`;
    topRoleCard.appsEl.textContent = topJob.applications;

    // Progress relative to the top application count (scale 100%)
    const maxProgress = (topJob.applications / maxApps) * 100;
    topRoleCard.progressEl.style.width = `${maxProgress}%`;
  } else {
    topRoleCard.titleEl.textContent = "No active job roles";
    topRoleCard.appsEl.textContent = "0";
    topRoleCard.progressEl.style.width = "0%";
  }

  // === Recent Activity Section ===
  const activities = [
    {
      name: "Aarav Sharma",
      action: "applied for",
      target: "Software Engineer @ Google",
      time: "2 hours ago",
      type: "job",
      color: "#3b82f6",
    },
    {
      name: "Priya Sharma",
      action: "registered for",
      target: "Tech Talk: AI in Industry",
      time: "3 hours ago",
      type: "event",
      color: "#22c55e",
    },
    {
      name: "Rahul Nair",
      action: "applied for",
      target: "Product Manager @ Microsoft",
      time: "5 hours ago",
      type: "job",
      color: "#eab308",
    },
    {
      name: "Sana Iyer",
      action: "applied for",
      target: "Data Analyst @ TCS",
      time: "6 hours ago",
      type: "job",
      color: "#8b5cf6",
    },
  ];

  const list = document.getElementById("recentActivity");
  list.innerHTML = activities
    .map(
      (a) => `
    <li class="activity-item">
      <div class="activity-dot" style="background:${a.color}"></div>
      <div class="activity-body">
        <div class="activity-title"><b>${a.name}</b> ${a.action} <a href="#">${a.target}</a></div>
        <div class="activity-sub">${a.type === "job" ? "Application received" : "Event registration"}</div>
      </div>
      <div class="activity-time">${a.time}</div>
    </li>`
    )
    .join("");
});
