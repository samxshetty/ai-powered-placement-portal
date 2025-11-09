
// js/signup.js — Supabase signup + profile creation
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get values
    const name = document.getElementById("signupName")?.value.trim();
    const roll = document.getElementById("signupRoll")?.value.trim();
    const department = document.getElementById("signupDept")?.value;
    const year = document.getElementById("signupYear")?.value;
    const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("signupPassword")?.value.trim();

    // Validation
    if (!name || !roll || !department || !year || !email || !password) {
      alert("⚠️ Please fill all fields before proceeding.");
      return;
    }

    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email);

    if (checkError) {
      console.error("Error checking user:", checkError);
      alert("Database error while checking user.");
      return;
    }

    if (existing && existing.length > 0) {
      alert("⚠️ Account already exists. Please login instead.");
      return;
    }

    // Insert user into Supabase 'users' table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          full_name: name,
          roll_no: roll,
          department,
          year,
          email,
          password
        }
      ])
      .select();

    if (userError) {
      console.error("Error inserting user:", userError);
      alert("Error creating account. Check console for details.");
      return;
    }

    const user = userData?.[0];
    const userId = user?.id;

    // Create initial blank profile in 'profiles' table
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        user_id: userId,
        cgpa: null,
        backlogs: null,
        tenth: null,
        twelfth: null,
        skills: "",
        interests: "",
        resume_url: ""
      }
    ]);

    if (profileError) {
      console.warn("Profile creation error:", profileError);
    }

    // Save session locally (email or ID)
    localStorage.setItem("activeUser", email);
    localStorage.setItem("activeUserId", userId);

    alert("✅ Account created successfully! Redirecting to Dashboard...");
    window.location.href = "dashboard.html";
  });
});
