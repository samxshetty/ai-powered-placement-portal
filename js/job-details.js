// job-details.js — Student Job Details & Application via Firestore

// ✅ Import initialized Firebase app instead of reinitializing it
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
    console.error("Error fetching job details:", err);
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>Failed to load job details.</h2>";
    return;
  }

  if (!snap.exists()) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>Job not found.</h2>";
    return;
  }

  const job = snap.data();
  const el = (id) => document.getElementById(id);

  // ✅ Check all required DOM elements before accessing
  const ids = [
    "jobRole",
    "jobCompanyName",
    "jobType",
    "jobLocation",
    "jobSalary",
    "jobDeadline",
    "jobDescription",
    "jobSkills",
    "applyBtn",
  ];

  for (const id of ids) {
    if (!el(id)) {
      console.error(`Element with ID "${id}" not found in HTML.`);
      return;
    }
  }

  // ✅ Populate job details
  el("jobRole").textContent = job.role || "Not specified";
  el("jobCompanyName").textContent = job.company || "Not specified";
  el("jobType").textContent = job.type || "Not specified";
  el("jobLocation").textContent = job.location || "Not specified";
  el("jobSalary").textContent = job.package || "Not specified";
  el("jobDeadline").textContent = "Apply by: " + (job.applyBy || "-");
  el("jobDescription").textContent = job.jobDescription || "No description available.";
  // ✅ Render skills safely (works with both array or comma-separated string)
  let skillsArray = [];

  if (Array.isArray(job.skills)) {
    skillsArray = job.skills; 
  } else if (typeof job.skills === "string") {
    skillsArray = job.skills.split(",").map((s) => s.trim());
  }

  el("jobSkills").innerHTML = skillsArray.length
  ? skillsArray.map((s) => `<span class='skill'>${s}</span>`).join("")
  : "<span>No skills specified.</span>";


  const applyBtn = el("applyBtn");

  // ✅ Get student info from localStorage (ensure proper format)
  const studentId = localStorage.getItem("activeUserId");
  const studentName = localStorage.getItem("activeUserName");
  const studentDept = localStorage.getItem("activeUserDept");
  const studentRoll = localStorage.getItem("activeUserRoll");
  const studentEmail = localStorage.getItem("activeUser");
  const studentYear = localStorage.getItem("activeUserYear");

  if (!studentId || !studentName) {
    applyBtn.textContent = "Profile Not Found";
    applyBtn.disabled = true;
    applyBtn.style.opacity = "0.6";
    return;
  }

  // ✅ Handle Apply Button Click
  applyBtn.addEventListener("click", async () => {
    try {
      // Add student to applicants list (if not already)
      await updateDoc(jobRef, { applicants: arrayUnion(studentId) });

      // Create an application record
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

      // ✅ Update UI
      alert("✅ Application submitted successfully!");
      applyBtn.textContent = "Applied";
      applyBtn.disabled = true;
      applyBtn.style.opacity = "0.6";
    } catch (err) {
      console.error("Error submitting application:", err);
      alert("❌ Failed to apply. Please try again later.");
    }
  });
});
