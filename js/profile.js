import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const db = window.db;
const auth = window.auth;

// -----------------------------
// Cloudinary helper
// -----------------------------
async function uploadToCloudinary(file) {
  const cloudName = "dkrjezt3a";
  const uploadPreset = "placementportal_unsigned";
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  return await res.json();
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
  // Fill all profile fields
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

    // ✅ Show saved profile picture
    if (storedProfile.profilePicURL) {
      profilePic.src = storedProfile.profilePicURL;
    }

    // ✅ Show saved resume
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
      console.error("Firestore fetch error:", err);
    }
  });

  // -----------------------------
  // Edit / Save button handlers
  // -----------------------------
  editBtn.addEventListener("click", () => setEditingMode(!isEditing));

  saveBtn.addEventListener("click", async () => {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) storedProfile[id] = el.value;
    });

    try {
      // 🔹 Save profile (for student view)
      await setDoc(doc(db, "profiles", userUID), storedProfile, { merge: true });

      // 🔹 Also sync essential info to "students" (for admin dashboard)
      const studentData = {
        name: storedProfile.fullName || "",
        email: storedProfile.email || "",
        phone: storedProfile.phone || "",
        usn: storedProfile.rollNumber || "",
        branch: storedProfile.department || "",
        sem: storedProfile.year || "",
        cgpa: Number(storedProfile.cgpa) || 0,
        backlog: Number(storedProfile.backlogs) || 0,
        status: "Active",
        company: "-",
        applied: 0,
        attended: 0,
        address: storedProfile.address || "",
        skills: storedProfile.skills
          ? storedProfile.skills.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        profilePicURL: storedProfile.profilePicURL || "",
        resumeURL: storedProfile.resumeURL || "",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "students", userUID), studentData, { merge: true });

      alert("✅ Profile saved & synced to admin dashboard!");
      fillFields();
      setEditingMode(false);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save profile.");
    }
  });

  // -----------------------------
  // Cloudinary Upload Handlers
  // -----------------------------
  profilePic.addEventListener("click", () => picUpload.click());

  picUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !userUID) return;

    try {
      const data = await uploadToCloudinary(file);
      storedProfile.profilePicURL = data.secure_url;
      profilePic.src = data.secure_url;
      await setDoc(doc(db, "profiles", userUID), { profilePicURL: data.secure_url }, { merge: true });
      await setDoc(doc(db, "students", userUID), { profilePicURL: data.secure_url }, { merge: true });
      alert("✅ Profile photo uploaded!");
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed.");
    }
  });

  uploadBtn.addEventListener("click", () => resumeUpload.click());

  resumeUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !userUID) return;

    try {
      const data = await uploadToCloudinary(file);
      storedProfile.resumeURL = data.secure_url;
      resumeStatus.innerHTML = `
        <a href="${data.secure_url}" target="_blank" style="color:green;text-decoration:underline;">
          View Uploaded Resume
        </a>
      `;
      await setDoc(doc(db, "profiles", userUID), { resumeURL: data.secure_url }, { merge: true });
      await setDoc(doc(db, "students", userUID), { resumeURL: data.secure_url }, { merge: true });
      alert("✅ Resume uploaded!");
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed.");
    }
  });

  // -----------------------------
  // Logout handler
  // -----------------------------
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "login.html";
  });

  setEditingMode(false);
});
