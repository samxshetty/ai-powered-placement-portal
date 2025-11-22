import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "ai-placement-portal-ca26c.firebaseapp.com",
  projectId: "ai-placement-portal-ca26c",
  storageBucket: "ai-placement-portal-ca26c.firebasestorage.app",
  messagingSenderId: "857694851640",
  appId: "1:857694851640:web:3211425de71a79d9840ccd",
  measurementId: "G-3KYRZJD49S"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

window.db = db;
window.auth = auth;
window.storage = storage;

export { app, db, auth, storage };
