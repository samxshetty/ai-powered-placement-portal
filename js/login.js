// ✅ login.js — Restricted Login (Only @nmamit.in emails)
import { db, auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) {
    console.error("❌ loginForm not found in DOM.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("⚠️ Please enter both email and password.");
      return;
    }

    // ✅ Restrict login to nmamit.in emails only
    if (!email.endsWith("@nmamit.in")) {
      alert("❌ Only NMAMIT email addresses (@nmamit.in) can log in.");
      return;
    }

    try {
      // 🔹 Firebase Auth sign-in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ User logged in:", user.uid);

      // 🔹 Fetch user details from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      if (!userDoc.exists()) {
        alert("⚠️ Account found but no profile data exists in Firestore. Please contact admin.");
      }

      // 🔹 Save session locally
      localStorage.setItem("activeUser", email);
      localStorage.setItem("activeUserId", user.uid);
      localStorage.setItem("activeUserName", userData.full_name || "");
      localStorage.setItem("activeUserDept", userData.department || "");
      localStorage.setItem("activeUserYear", userData.year || "");
      localStorage.setItem("activeUserRoll", userData.roll_no || "");

      alert(`✅ Welcome back, ${userData.full_name || "Student"}!`);
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);

      if (error.code === "auth/user-not-found") {
        alert("❌ No account found. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        alert("❌ Incorrect password. Try again.");
      } else if (error.code === "auth/network-request-failed") {
        alert("⚠️ Network issue — please check your internet connection.");
      } else {
        alert("⚠️ Login failed: " + error.message);
      }
    }
  });
});
