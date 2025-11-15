document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> {
      if(confirm("Log out?")){ localStorage.removeItem("activeUser"); window.location.href = "login.html"; }
    });
  });

  const loginForm = document.getElementById("login-form");
  if(loginForm){
    loginForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const fm = new FormData(loginForm);
      const name = (fm.get("name")||"").toString().trim();
      const college = (fm.get("college")||"").toString().trim();
      const branch = (fm.get("branch")||"").toString().trim();
      if(!name){ alert("Enter name"); return; }
      const users = JSON.parse(localStorage.getItem("users")||"[]");
      const user = { id: Date.now(), name, college, branch, createdAt: new Date().toISOString() };
      users.push(user);
      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("activeUser", JSON.stringify(user));
      // redirect to profile setup on first time:
      window.location.href = "profile.html";
    });
  }

  document.querySelectorAll(".nav-links a").forEach(a=>{
    const href = a.getAttribute("href");
    const current = window.location.pathname.split("/").pop() || "index.html";
    if(href === current) a.classList.add("active");
  });
});
