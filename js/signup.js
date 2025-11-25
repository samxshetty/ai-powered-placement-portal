import { db, auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");

  if (!form) {
    console.error("❌ signupForm not found in DOM.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const roll = document.getElementById("signupRoll").value.trim();
    const department = document.getElementById("signupDept").value;
    const year = document.getElementById("signupYear").value;
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value.trim();

    if (!name || !roll || !department || !year || !email || !password) {
      alert("⚠️ Please fill in all fields before proceeding.");
      return;
    }

    if (!email.endsWith("@nmamit.in")) {
      alert("❌ Only NMAMIT email addresses (@nmamit.in) are allowed to sign up.");
      return;
    }

    try {
      const existingMethods = await fetchSignInMethodsForEmail(auth, email);
      if (existingMethods.length > 0) {
        alert("⚠️ This email is already registered. Please log in instead.");
        window.location.href = "login.html";
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ Auth user created:", user.uid);

      await setDoc(doc(db, "users", user.uid), {
        full_name: name,
        roll_no: roll,
        department,
        year,
        email,
        createdAt: new Date().toISOString(),
        profileCompleted: false,
      });
      console.log("✅ Firestore users doc created");

      await setDoc(doc(db, "profiles", user.uid), {
        fullName: name,
        rollNumber: roll,
        department: department,
        year: year,
        email: email,
        phone: "",
        linkedin: "",
        github: "",
        portfolio: "",
        cgpa: "",
        backlogs: "",
        tenth: "",
        twelfth: "",
        skills: "",
        interests: "",
        achievements: "",
        profilePicURL: "",
        resumeURL: "",
        createdAt: new Date().toISOString()
      }, { merge: true });

      console.log("✅ Firestore profile created successfully.");

      localStorage.setItem("activeUser", email);
      localStorage.setItem("activeUserId", user.uid);
      localStorage.setItem("activeUserName", name);
      localStorage.setItem("activeUserDept", department);
      localStorage.setItem("activeUserYear", year);
      localStorage.setItem("activeUserRoll", roll);

      alert("✅ Account created successfully! Please complete your profile next.");
      window.location.href = "profile.html";

    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("⚠️ Email already registered. Please log in instead.");
      } else if (error.code === "auth/network-request-failed") {
        alert("⚠️ Network issue — check your internet connection.");
      } else if (error.code === "auth/invalid-api-key") {
        alert("❌ Invalid Firebase configuration. Check firebase-init.js.");
      } else {
        alert("❌ Signup failed: " + error.message);
      }
    }
  });
});
