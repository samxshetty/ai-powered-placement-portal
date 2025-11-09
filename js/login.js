// js/login.js — Supabase Login for PlacementHub
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) {
    console.error("⚠️ loginForm not found. Check your form ID.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get credentials
    const email = document.getElementById("loginEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!email || !password) {
      alert("⚠️ Please enter both email and password.");
      return;
    }

    // 🔍 Check for matching user in Supabase
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      alert("❌ Unable to connect to the database. Please try again later.");
      return;
    }

    if (!userData || userData.length === 0) {
      alert("❌ Invalid email or password. Please try again.");
      return;
    }

    const user = userData[0];
    console.log("✅ Logged in user:", user);

    // 🧠 Save active session locally
    localStorage.setItem("activeUser", user.email);
    localStorage.setItem("activeUserId", user.id);
    localStorage.setItem("activeUserName", user.full_name);
    localStorage.setItem("activeUserDept", user.department);
    localStorage.setItem("activeUserYear", user.year);
    localStorage.setItem("activeUserRoll", user.roll_no);

    alert(`✅ Welcome back, ${user.full_name || "Student"}!`);
    window.location.href = "dashboard.html";
  });
});
