document.addEventListener("DOMContentLoaded", () => {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const profiles = JSON.parse(localStorage.getItem("profile") || "{}"); // single or multiple profiles
  const tbody = document.querySelector("#userTable tbody");
  const clearAll = document.getElementById("clearAll");

  const userModal = document.getElementById("userModal");
  const profileModal = document.getElementById("profileModal");

  const closeUserModal = userModal.querySelector(".close");
  const closeProfileModal = profileModal.querySelector(".closeProfile");

  const userDetailsDiv = document.getElementById("userDetails");
  const profileDetailsDiv = document.getElementById("profileDetails");

  // Render main user table
  function renderTable() {
    tbody.innerHTML = "";

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:10px;">No users found</td></tr>`;
      return;
    }

    users.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.name || "—"}</td>
        <td>${u.department || "—"}</td>
        <td>${u.year || "—"}</td>
        <td>${u.email || "—"}</td>
        <td>
          <button class="view" data-index="${index}">View</button>
          <button class="profile" data-email="${u.email}">Profile</button>
          <button class="delete" data-index="${index}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // View signup data
  function showUserDetails(user) {
    userDetailsDiv.innerHTML = `
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Roll:</strong> ${user.roll}</p>
      <p><strong>Department:</strong> ${user.department}</p>
      <p><strong>Year:</strong> ${user.year}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Password:</strong> ${user.password}</p>
    `;
    userModal.style.display = "flex";
  }

  // View full profile
  function showProfile(email) {
    const profileData = JSON.parse(localStorage.getItem("profile") || "{}");

    if (!Object.keys(profileData).length) {
      alert("No profile data found for this user.");
      return;
    }

    // Display details
    profileDetailsDiv.innerHTML = `
      <p><strong>GitHub:</strong> ${profileData.github || "—"}</p>
      <p><strong>LinkedIn:</strong> ${profileData.linkedin || "—"}</p>
      <p><strong>CGPA:</strong> ${profileData.cgpa || "—"}</p>
      <p><strong>Experience:</strong> ${profileData.experience || "—"}</p>
      <p><strong>Projects:</strong> ${profileData.projects || "—"}</p>
      <p><strong>Certifications:</strong> ${profileData.certifications || "—"}</p>

      <h4>Uploaded Files</h4>
      <ul>
        <li>Photo: ${profileData.photo || "—"}</li>
        <li>Signature: ${profileData.signature || "—"}</li>
        <li>Resume: ${profileData.resume || "—"}</li>
        <li>Marksheet: ${profileData.marksheet || "—"}</li>
        <li>Aadhar: ${profileData.aadhar || "—"}</li>
        <li>PAN: ${profileData.pan || "—"}</li>
      </ul>
    `;
    profileModal.style.display = "flex";
  }

  // Table buttons
  tbody.addEventListener("click", (e) => {
    const idx = e.target.dataset.index;
    const email = e.target.dataset.email;

    if (e.target.classList.contains("view")) {
      showUserDetails(users[idx]);
    } else if (e.target.classList.contains("profile")) {
      showProfile(email);
    } else if (e.target.classList.contains("delete")) {
      if (confirm("Are you sure you want to delete this user?")) {
        users.splice(idx, 1);
        localStorage.setItem("users", JSON.stringify(users));
        renderTable();
      }
    }
  });

  // Clear all
  clearAll.addEventListener("click", () => {
    if (confirm("Clear all users and profiles?")) {
      localStorage.removeItem("users");
      localStorage.removeItem("profile");
      window.location.reload();
    }
  });

  // Modal controls
  [closeUserModal, closeProfileModal].forEach(btn =>
    btn.addEventListener("click", () => {
      userModal.style.display = "none";
      profileModal.style.display = "none";
    })
  );

  window.addEventListener("click", (e) => {
    if (e.target === userModal) userModal.style.display = "none";
    if (e.target === profileModal) profileModal.style.display = "none";
  });

  renderTable();
});
