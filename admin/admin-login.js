document.getElementById("adminLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  if (email === "admin@nmamit.in" && password === "admin") {
    localStorage.setItem("isAdmin", true);
    window.location.href = "index.html";
  } else {
    errorMsg.classList.remove("hidden");
  }
});
