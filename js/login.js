import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSnqOceW18iAhuHmWl31M3Gk38cdiWlHE",
  authDomain: "ai-powered-placement-portal.firebaseapp.com",
  projectId: "ai-powered-placement-portal",
storageBucket: "ai-powered-placement-portal.appspot.com",
  messagingSenderId: "814349983103",
  appId: "1:814349983103:web:56cd2a5c5356019223ce4a",
  measurementId: "G-RG8P2P71H7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("⚠️ Please enter both email and password.");
      return;
    }

    try {
      // Firebase sign-in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user details from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Store session data
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
      } else {
        alert("⚠️ Login failed. Check console for details.");
      }
    }
  });
});
