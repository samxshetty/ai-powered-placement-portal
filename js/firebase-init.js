// firebase-init.js — Browser SDK (v10.13.0)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSnqOceW18iAhuHmWl31M3Gk38cdiWlHE",
  authDomain: "ai-powered-placement-portal.firebaseapp.com",
  projectId: "ai-powered-placement-portal",
  storageBucket: "ai-powered-placement-portal.appspot.com",
  messagingSenderId: "814349983103",
  appId: "1:814349983103:web:56cd2a5c5356019223ce4a",
  measurementId: "G-RG8P2P71H7",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ Export for all scripts
export { app, db, auth, storage };
