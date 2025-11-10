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
    "fullName","email","phone","linkedin","github","portfolio",
    "rollNumber","department","year","cgpa","backlogs",
    "tenth","twelfth","skills","interests","achievements"
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

  // Enable/disable helper
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

  // Fill UI from storedProfile
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
  }

  // -----------------------------
  // Auth listener
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
        // Fallback from users collection
        const userSnap = await getDoc(doc(db, "users", userUID));
        if (userSnap.exists()) {
          const u = userSnap.data();
          storedProfile = {
            fullName: u.full_name || u.name || "",
            email: u.email || user.email,
            department: u.department || "",
            year: u.year || "",
            rollNumber: u.roll_no || u.roll || ""
          };
          await setDoc(ref, storedProfile);
        } else {
          storedProfile = { email: user.email };
          await setDoc(ref, storedProfile);
        }
      }

      // normalize naming
      storedProfile.fullName = storedProfile.fullName || storedProfile.full_name || "";
      storedProfile.rollNumber = storedProfile.rollNumber || storedProfile.roll_no || "";
      storedProfile.backlogs = storedProfile.backlogs || "None";

      fillFields();
      setEditingMode(false);
    } catch (err) {
      console.error("Firestore fetch error:", err);
    }
  });

  // -----------------------------
  // Edit/save handlers
  // -----------------------------
  editBtn.addEventListener("click", () => setEditingMode(!isEditing));

  saveBtn.addEventListener("click", async () => {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) storedProfile[id] = el.value;
    });

    try {
      await setDoc(doc(db, "profiles", userUID), storedProfile, { merge: true });
      alert("✅ Profile saved!");
      fillFields();
      setEditingMode(false);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save.");
    }
  });

  // -----------------------------
  // Uploads
  // -----------------------------
  profilePic.addEventListener("click", () => picUpload.click());
  picUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !userUID) return;
    try {
      const data = await uploadToCloudinary(file);
      storedProfile.profilePicURL = data.secure_url;
      profilePic.src = data.secure_url;
      await setDoc(doc(db, "profiles", userUID),
        { profilePicURL: data.secure_url }, { merge: true });
      alert("✅ Photo uploaded!");
    } catch (err) { console.error(err); alert("Upload failed"); }
  });

  uploadBtn.addEventListener("click", () => resumeUpload.click());
  resumeUpload.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !userUID) return;
    try {
      const data = await uploadToCloudinary(file);
      storedProfile.resumeURL = data.secure_url;
      resumeStatus.textContent = `${file.name} ✅ Uploaded`;
      resumeStatus.style.color = "green";
      await setDoc(doc(db, "profiles", userUID),
        { resumeURL: data.secure_url }, { merge: true });
    } catch (err) { console.error(err); alert("Upload failed"); }
  });

  // -----------------------------
  // Logout
  // -----------------------------
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "login.html";
  });

  setEditingMode(false);
});
