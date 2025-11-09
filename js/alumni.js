document.addEventListener("DOMContentLoaded", () => {
  const alumniGrid = document.getElementById("alumniGrid");
  const searchCompany = document.getElementById("searchCompany");
  const searchRole = document.getElementById("searchRole");
  const logoutBtn = document.querySelector(".logout-btn");

  // Sample Alumni Data (replace later with Firestore)
  const alumniList = [
    {
      name: "Aarav Sharma",
      company: "Google",
      role: "Software Engineer",
      batch: "2023",
      domain: "AI & ML",
      experience: "2 years",
      cgpa: "9.2",
      tips: "Focus on DSA + real projects. Build consistent GitHub commits.",
      location: "Bangalore, India",
      linkedin: "https://linkedin.com/in/aaravsharma"
    },
    {
      name: "Meera Iyer",
      company: "Amazon",
      role: "Data Analyst",
      batch: "2022",
      domain: "Data Science",
      experience: "1.5 years",
      cgpa: "8.9",
      tips: "Strong SQL & visualization skills helped me stand out.",
      location: "Hyderabad, India",
      linkedin: "https://linkedin.com/in/meera-iyer"
    },
    {
      name: "Rohan Desai",
      company: "Microsoft",
      role: "Product Manager",
      batch: "2023",
      domain: "Software + Strategy",
      experience: "2 years",
      cgpa: "9.0",
      tips: "Be clear in communication and understand user empathy.",
      location: "Remote",
      linkedin: "https://linkedin.com/in/rohandesai"
    },
    {
      name: "Priya Menon",
      company: "Tesla",
      role: "Machine Learning Engineer",
      batch: "2021",
      domain: "Deep Learning / Computer Vision",
      experience: "3 years",
      cgpa: "9.4",
      tips: "Work on interdisciplinary projects & research.",
      location: "California, USA",
      linkedin: "https://linkedin.com/in/priyamenon"
    }
  ];

  // Render Alumni Cards
  function renderAlumni(list) {
    alumniGrid.innerHTML = "";
    if (!list.length) {
      alumniGrid.innerHTML = `<p class="muted" style="text-align:center;margin-top:20px;">No alumni found.</p>`;
      return;
    }

    list.forEach((a) => {
      const card = document.createElement("div");
      card.className = "alumni-card";
      card.innerHTML = `
        <h3>${a.name}</h3>
        <p><strong>${a.role}</strong> @ ${a.company}</p>
        <p><strong>Batch:</strong> ${a.batch}</p>
        <p><strong>Domain:</strong> ${a.domain}</p>
        <p><strong>Experience:</strong> ${a.experience}</p>
        <p><strong>CGPA:</strong> ${a.cgpa}</p>
        <p><strong>Tips:</strong> ${a.tips}</p>
        <p><strong>Location:</strong> ${a.location}</p>
        <button class="connect-btn" onclick="window.open('${a.linkedin}', '_blank')">Connect on LinkedIn</button>
      `;
      alumniGrid.appendChild(card);
    });
  }

  // Dual Search Filters
  function applyFilters() {
    const cText = searchCompany.value.toLowerCase();
    const rText = searchRole.value.toLowerCase();

    const filtered = alumniList.filter(a =>
      a.company.toLowerCase().includes(cText) &&
      a.role.toLowerCase().includes(rText)
    );

    renderAlumni(filtered);
  }

  searchCompany.addEventListener("input", applyFilters);
  searchRole.addEventListener("input", applyFilters);

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("activeUser");
    window.location.href = "login.html";
  });

  renderAlumni(alumniList);
});
