import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGpuBp7gt2fvMwLJJWLO8cqDE1egSoIKQ",
  authDomain: "placementportal-aipowered.firebaseapp.com",
  projectId: "placementportal-aipowered",
  storageBucket: "placementportal-aipowered.firebasestorage.app",
  messagingSenderId: "975982127798",
  appId: "1:975982127798:web:84799ef7db78ed5a7e5417",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

window.db = db;
window.auth = auth;
window.storage = storage;

export { app, db, auth, storage };
