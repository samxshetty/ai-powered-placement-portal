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
  const changePicBtn = document.getElementById("changePicBtn");

  const sidebarName = document.getElementById("profileName");
  const sidebarEmail = document.getElementById("profileEmail");
  const sidebarDept = document.getElementById("profileDept");
  const sidebarYear = document.getElementById("profileYear");
  const sidebarRoll = document.getElementById("profileRoll");

  // Active user and profile key
  let activeUser = localStorage.getItem("activeUser") || "guest";
  const profileKey = "profile_" + activeUser;
  let storedProfile = JSON.parse(localStorage.getItem(profileKey) || "{}");

  // ✅ Load stored data into fields
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && storedProfile[id]) el.value = storedProfile[id];
  });

  // ✅ Load profile picture
  if (storedProfile.profilePic) {
    profilePic.src = storedProfile.profilePic;
  }

  // ✅ Update sidebar info
  function updateSidebar() {
    sidebarName.textContent = storedProfile.fullName || "Student Name";
    sidebarEmail.textContent = storedProfile.email || "email@example.com";
    sidebarDept.textContent = storedProfile.department || "Department";
    sidebarYear.textContent = "Year: " + (storedProfile.year || "1");
    sidebarRoll.textContent = "Roll No: " + (storedProfile.rollNumber || "NU25XXX");
    if (storedProfile.profilePic) profilePic.src = storedProfile.profilePic;
  }
  updateSidebar();

  // ✅ Enable editing
  let isEditing = false;
  editBtn.addEventListener("click", () => {
    isEditing = !isEditing;
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !isEditing;
    });
    uploadBtn.disabled = !isEditing;
    changePicBtn.disabled = !isEditing;
    saveBtn.disabled = !isEditing;
    editBtn.textContent = isEditing ? "Cancel Edit" : "Edit Profile";
  });

// ✅ Profile Picture Click + Upload
profilePic.addEventListener("click", () => picUpload.click());

picUpload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    storedProfile.profilePic = reader.result;
    profilePic.src = reader.result;
    localStorage.setItem(profileKey, JSON.stringify(storedProfile));
    updateSidebar();
  };
  reader.readAsDataURL(file);
});


  // ✅ Resume upload
  uploadBtn.addEventListener("click", () => resumeUpload.click());
  resumeUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      storedProfile.resumeName = file.name;
      storedProfile.resumeData = reader.result;
      localStorage.setItem(profileKey, JSON.stringify(storedProfile));
      resumeStatus.textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  // ✅ Save profile
  saveBtn.addEventListener("click", () => {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) storedProfile[id] = el.value;
    });

    localStorage.setItem(profileKey, JSON.stringify(storedProfile));
    updateSidebar();
    alert("✅ Profile updated successfully!");

    // Lock fields again
    isEditing = false;
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    uploadBtn.disabled = true;
    changePicBtn.disabled = true;
    saveBtn.disabled = true;
    editBtn.textContent = "Edit Profile";
  });

  // ✅ Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("activeUser");
    window.location.href = "login.html";
  });

  // Lock everything on start
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
  uploadBtn.disabled = true;
  changePicBtn.disabled = true;
  saveBtn.disabled = true;
});
