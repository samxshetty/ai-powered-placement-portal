import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

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

// Signup form logic
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const roll = document.getElementById("signupRoll").value.trim();
    const department = document.getElementById("signupDept").value;
    const year = document.getElementById("signupYear").value;
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value.trim();

    if (!name || !roll || !department || !year || !email || !password) {
      alert("⚠️ Please fill all fields before proceeding.");
      return;
    }

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        full_name: name,
        roll_no: roll,
        department,
        year,
        email,
        createdAt: new Date(),
      });

      // Save session
      localStorage.setItem("activeUser", email);
      localStorage.setItem("activeUserId", user.uid);
      localStorage.setItem("activeUserName", name);
      localStorage.setItem("activeUserDept", department);
      localStorage.setItem("activeUserYear", year);
      localStorage.setItem("activeUserRoll", roll);

      alert("✅ Account created successfully! Redirecting to Dashboard...");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Error during signup:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("⚠️ Email already registered. Please log in instead.");
      } else {
        alert("❌ Failed to create account. Check console for details.");
      }
    }
  });
});
