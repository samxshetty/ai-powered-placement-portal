// js/job-details.js — FINAL fixed version
document.addEventListener("DOMContentLoaded", () => {
  // Wait until job data is ready
  function waitForJobsData(callback) {
    if (window.__PLACEMENTHUB_JOBS && window.__PLACEMENTHUB_JOBS.length > 0) {
      callback(window.__PLACEMENTHUB_JOBS);
    } else {
      setTimeout(() => waitForJobsData(callback), 100);
    }
  }

  waitForJobsData((jobs) => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");
    const appId = params.get("appId");

    const job = jobs.find(j => String(j.id) === String(jobId));

    if (!job) {
      document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>Job not found.</h2>";
      return;
    }

    const el = id => document.getElementById(id);
    const activeUser = localStorage.getItem("activeUser") || "guest";
    const key = "applications_" + activeUser;

    const readApplications = () => JSON.parse(localStorage.getItem(key) || "[]");
    const saveApplications = arr => {
      localStorage.setItem(key, JSON.stringify(arr));
      localStorage.setItem(key + "_updated_at", new Date().toISOString());
    };

    const applications = readApplications();

    // 🔍 Find application record robustly
    const application = applications.find(a =>
      String(a.applicationId) === String(appId) ||
      String(a.id) === String(appId) ||
      String(a.jobId) === String(jobId) ||
      String(a.eventId) === String(jobId)
    );

    // 🧱 Fill job details
    el("jobRole").textContent = job.role;
    el("jobCompanyName").textContent = job.company;
    el("jobType").textContent = job.type;
    el("jobLocation").textContent = job.location;
    el("jobSalary").textContent = job.salary;
    el("jobDeadline").textContent = "Apply by: " + job.deadline;
    el("applyDeadline").textContent = "Deadline: " + job.deadline;
    el("jobDescription").textContent = job.description || "No description available.";
    el("jobSkills").innerHTML = (job.skills || []).map(s => `<span class="skill">${s}</span>`).join("");
    el("jobRequirements").innerHTML = (job.requirements || []).map(r => `<li><span class='check-icon'>✓</span>${r}</li>`).join("");
    el("jobResponsibilities").innerHTML = (job.responsibilities || []).map(r => `<li><span class='check-icon'>✓</span>${r}</li>`).join("");
    el("jobBenefits").innerHTML = (job.benefits || []).map(b => `<li><span class='check-icon'>✓</span>${b}</li>`).join("");

    const applyBtn = el("applyBtn");

    function updateApplyButton() {
      const alreadyApplied = applications.some(a => String(a.jobId) === String(job.id));
      if (alreadyApplied) {
        applyBtn.textContent = "Applied";
        applyBtn.disabled = true;
        applyBtn.style.opacity = "0.6";
      } else {
        applyBtn.textContent = "Submit Application";
        applyBtn.disabled = false;
        applyBtn.style.opacity = "1";
      }
    }

    // 🧩 Handle Apply
    applyBtn.addEventListener("click", () => {
      const alreadyApplied = applications.some(a => String(a.jobId) === String(job.id));
      if (alreadyApplied) return alert("You have already applied for this job.");

      const record = {
        applicationId: "app_" + Date.now(),
        jobId: job.id,
        company: job.company,
        role: job.role,
        appliedAt: new Date().toISOString(),
        status: "Applied"
      };

      applications.push(record);
      saveApplications(applications);
      updateApplyButton();
      alert("✅ Application submitted successfully!");
    });

    updateApplyButton();

    // ✅ Show "Information You Submitted" if opened via Applications
    if (application) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find(u => u.id === activeUser) || {};

      const infoCard = document.createElement("section");
      infoCard.className = "card";
      infoCard.innerHTML = `
        <h3>Information You Submitted</h3>
        <ul class="check-list">
          <li><strong>Name:</strong> ${user.name || "N/A"}</li>
          <li><strong>Email:</strong> ${user.email || "email@example.com"}</li>
          <li><strong>Resume:</strong> ${user.resume || "Not provided"}</li>
          <li><strong>Department:</strong> ${user.dept || "N/A"}</li>
          <li><strong>CGPA:</strong> ${user.cgpa || "N/A"}</li>
          <li><strong>Applied On:</strong> ${new Date(application.appliedAt).toLocaleString()}</li>
        </ul>
      `;

      const benefitsSection = document.getElementById("jobBenefits")?.closest(".card");
      benefitsSection?.insertAdjacentElement("afterend", infoCard);
    } else if (appId) {
      alert("⚠️ Job details not found for this application.");
    }
  });
});
