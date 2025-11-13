// job-details.js — Student Job Details & Application via Firestore
import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id");

  if (!jobId) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>Invalid job ID.</h2>";
    return;
  }

  const jobRef = doc(db, "jobs", jobId);

  let snap;
  try {
    snap = await getDoc(jobRef);
  } catch (err) {
    console.error("Error fetching job:", err);
    return;
  }

  if (!snap.exists()) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>Job not found.</h2>";
    return;
  }

  const job = snap.data();
  const el = (id) => document.getElementById(id);

  // Load main details
  el("jobRole").textContent = job.role || "Not specified";
  el("jobCompanyName").textContent = job.company || "Not specified";
  el("jobType").textContent = job.type || "Not specified";
  el("jobLocation").textContent = job.location || "Not specified";
  el("jobSalary").textContent = job.package || "Not Revealed";

  // DEADLINE (your Firestore field is 'deadline')
  el("jobDeadline").textContent = "Apply by: " + (job.deadline || "-");

  // STATUS
  if (job.status) {
    el("jobStatus").textContent = job.status;
    el("jobStatus").className = "status " + job.status.toLowerCase();
  }

  // DESCRIPTION (Firestore: description)
  el("jobDescription").textContent = job.description || "No description available.";

  // REQUIREMENTS (Firestore: requirements — big string → bullets)
  el("jobRequirements").innerHTML = job.requirements
    ? job.requirements.split(".").map(p => p.trim()).filter(p=>p).map(p => `<li>${p}</li>`).join("")
    : "<li>No requirements listed.</li>";

  // RESPONSIBILITIES (Firestore: eligibility)
  el("jobResponsibilities").innerHTML = job.eligibility
    ? job.eligibility.split(".").map(p => p.trim()).filter(p=>p).map(p => `<li>${p}</li>`).join("")
    : "<li>No responsibilities listed.</li>";

  // BENEFITS (Firestore: benefits)
  el("jobBenefits").innerHTML = job.benefits
    ? job.benefits.split(".").map(p => p.trim()).filter(p=>p).map(p => `<li>${p}</li>`).join("")
    : "<li>No benefits provided.</li>";

  // SKILLS (string OR array)
  let skillsArray = [];
  if (Array.isArray(job.skills)) skillsArray = job.skills;
  else if (typeof job.skills === "string" && job.skills.trim() !== "") {
    skillsArray = job.skills.split(",").map(s => s.trim());
  }

  el("jobSkills").innerHTML = skillsArray.length
    ? skillsArray.map(s => `<span class="skill">${s}</span>`).join("")
    : "<span>No skills listed.</span>";

  // APPLY BUTTON
  const applyBtn = el("applyBtn");

  const studentId = localStorage.getItem("activeUserId");
  const studentName = localStorage.getItem("activeUserName");
  const studentDept = localStorage.getItem("activeUserDept");
  const studentRoll = localStorage.getItem("activeUserRoll");
  const studentEmail = localStorage.getItem("activeUser");
  const studentYear = localStorage.getItem("activeUserYear");

  // If logged in
  if (!studentId || !studentName) {
    applyBtn.textContent = "Login to Apply";
    applyBtn.disabled = true;
    return;
  }

  applyBtn.addEventListener("click", async () => {
    try {
      // Add student to applicants array
      await updateDoc(jobRef, { applicants: arrayUnion(studentId) });

      // Create application entry
      await setDoc(doc(db, "applications", `${studentId}_${jobId}`), {
        jobId,
        studentId,
        studentName,
        studentEmail,
        dept: studentDept,
        rollNo: studentRoll,
        year: studentYear,
        appliedAt: new Date().toISOString(),
        status: "Applied",
        jobRole: job.role,
        jobCompany: job.company,
      });

      alert("Application submitted!");
      applyBtn.textContent = "Applied";
      applyBtn.disabled = true;
    } catch (err) {
      console.error(err);
      alert("Could not apply!");
    }
  });
});
