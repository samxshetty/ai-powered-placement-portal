const db = window.db;
const auth = window.auth;

// Firestore modular functions
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// SUPABASE
const supabase = window.supabaseClient;
const BUCKET_PICS = window.bucketProfilePics;
const BUCKET_RESUMES = window.bucketResumes;

// -----------------------------
// Upload file to Supabase
// -----------------------------
async function uploadToSupabase(bucket, file, userUID) {
  try {
    const filePath = `${userUID}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicData.publicUrl;

  } catch (err) {
    console.error("❌ Supabase upload failed:", err);
    throw err;
  }
}

// -----------------------------
// Main logic
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {

  const fieldIds = [
    "fullName", "email", "phone", "linkedin", "github", "portfolio",
    "rollNumber", "department", "year", "cgpa", "backlogs",
    "tenth", "twelfth", "skills", "interests", "achievements"
  ];

  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const resumeUpload = document.getElementById("resumeUpload");
  const resumeStatus = document.getElementById("resumeStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const profilePic = document.getElementById("profilePic");
  const picUpload = document.getElementById("picUpload");

  const sidebarName = document.getElementById("profileName");
  const sidebarEmail = document.getElementById("profileEmail");
  const sidebarDept = document.getElementById("profileDept");
  const sidebarYear = document.getElementById("profileYear");
  const sidebarRoll = document.getElementById("profileRoll");

  let userUID = null;
  let storedProfile = {};
  let isEditing = false;

  // -----------------------------
  // Enable/disable editing
  // -----------------------------
  function setEditingMode(state) {
    isEditing = state;

    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !state;
    });

    uploadBtn.disabled = !state;
    saveBtn.disabled = !state;

    editBtn.textContent = state ? "Cancel Edit" : "Edit Profile";
  }

  // -----------------------------
  // Fill profile fields
  // -----------------------------
  function fillFields() {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = storedProfile[id] || "";
    });

    sidebarName.textContent = storedProfile.fullName || "Student Name";
    sidebarEmail.textContent = storedProfile.email || "email@example.com";
    sidebarDept.textContent = storedProfile.department || "Department";
    sidebarYear.textContent = "Year: " + (storedProfile.year || "1st Year");
    sidebarRoll.textContent = "Roll No: " + (storedProfile.rollNumber || "NU25XXX");

    if (storedProfile.profilePicURL) profilePic.src = storedProfile.profilePicURL;

    if (storedProfile.resumeURL) {
      resumeStatus.innerHTML = `
        <a href="${storedProfile.resumeURL}" target="_blank" style="color:green;text-decoration:underline;">
          View Uploaded Resume
        </a>
      `;
    } else {
      resumeStatus.textContent = "No resume uploaded";
    }
  }

  // -----------------------------
  // ⛔ FIX: ADD THIS CLICK HANDLER
  // -----------------------------
  editBtn.addEventListener("click", () => {
    console.log("Edit button clicked"); // debug

    if (!isEditing) {
      setEditingMode(true);
    } else {
      setEditingMode(false);
      fillFields();
    }
  });

  // -----------------------------
  // Firebase Auth listener
  // -----------------------------
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Please log in again");
      window.location.href = "login.html";
      return;
    }

    userUID = user.uid;

    try {
      const ref = doc(db, "profiles", userUID);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        storedProfile = snap.data();
      } else {
        storedProfile = { email: user.email };
        await setDoc(ref, storedProfile);
      }

      fillFields();
      setEditingMode(false);

    } catch (err) {
      console.error("❌ Firestore fetch error:", err);
    }
  });

  // -----------------------------
  // SAVE PROFILE
  // -----------------------------
  saveBtn.addEventListener("click", async () => {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) storedProfile[id] = el.value;
    });

    try {
      await setDoc(doc(db, "profiles", userUID), storedProfile, { merge: true });

      const studentData = {
        name: storedProfile.fullName,
        email: storedProfile.email,
        phone: storedProfile.phone,
        usn: storedProfile.rollNumber,
        branch: storedProfile.department,
        sem: storedProfile.year,
        cgpa: Number(storedProfile.cgpa) || 0,
        backlog: Number(storedProfile.backlogs) || 0,
        skills: storedProfile.skills?.split(",").map(s => s.trim()) || [],
        profilePicURL: storedProfile.profilePicURL || "",
        resumeURL: storedProfile.resumeURL || "",
        status: "Active",
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "students", userUID), studentData, { merge: true });

      alert("✅ Profile updated successfully!");
      setEditingMode(false);

    } catch (err) {
      console.error(err);
      alert("❌ Failed to save profile.");
    }
  });

  // -----------------------------
  // Upload Profile Picture
  // -----------------------------
  profilePic.addEventListener("click", () => picUpload.click());

  picUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const url = await uploadToSupabase(BUCKET_PICS, file, userUID);

      storedProfile.profilePicURL = url;
      profilePic.src = url;

      await setDoc(doc(db, "profiles", userUID), { profilePicURL: url }, { merge: true });
      await setDoc(doc(db, "students", userUID), { profilePicURL: url }, { merge: true });

      alert("✅ Profile photo updated!");

    } catch (err) {
      alert("❌ Failed to upload profile photo.");
    }
  });

  // -----------------------------
  // Upload Resume
  // -----------------------------
  uploadBtn.addEventListener("click", () => resumeUpload.click());

  resumeUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const url = await uploadToSupabase(BUCKET_RESUMES, file, userUID);

      storedProfile.resumeURL = url;

      resumeStatus.innerHTML = `
        <a href="${url}" target="_blank" style="color:green;text-decoration:underline;">
          View Uploaded Resume
        </a>
      `;

      await setDoc(doc(db, "profiles", userUID), { resumeURL: url }, { merge: true });
      await setDoc(doc(db, "students", userUID), { resumeURL: url }, { merge: true });

      alert("✅ Resume uploaded!");

    } catch (err) {
      alert("❌ Failed to upload resume.");
    }
  });

  // -----------------------------
  // Logout
  // -----------------------------
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "login.html";
  });

});
