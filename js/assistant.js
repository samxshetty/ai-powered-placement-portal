// =====================================================
//  AI Placement Assistant — Firebase v10 (Final Version)
// =====================================================

// Import Firebase services from firebase-init.js
import { db, auth } from "./firebase-init.js";

// Firestore import
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// PDF.js worker fix
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// ----------------------------------
//  Gemini API Key  (USE NEW KEY ONLY)
// ----------------------------------
const GEMINI_API_KEY = "AIzaSyCpvWjeqzQfwDm3PNgn7HF051pIfhul-_8";

let currentJobData = {};
let userProfile = {};
let resumeText = "";


// ------------------------------------------------------
// Load Job Details
// ------------------------------------------------------
async function loadJobDetails() {
  try {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (!jobId) {
      console.error("❌ No jobId found in URL");
      return;
    }

    const ref = doc(db, "jobs", jobId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.error("❌ Job not found");
      return;
    }

    currentJobData = snap.data();
    console.log("🔥 Job Loaded:", currentJobData);

  } catch (err) {
    console.error("❌ loadJobDetails error:", err);
  }
}


// ------------------------------------------------------
// Load User Profile
// ------------------------------------------------------
async function loadUserProfile() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return reject("User not logged in");

      try {
        const ref = doc(db, "profiles", user.uid);
        const snap = await getDoc(ref);

        userProfile = snap.exists() ? snap.data() : {};
        console.log("🔥 User Profile:", userProfile);

        resolve();

      } catch (err) {
        console.error("❌ loadUserProfile error:", err);
        reject(err);
      }
    });
  });
}


// ------------------------------------------------------
// Extract PDF Resume
// ------------------------------------------------------
async function extractResumePDF(url) {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(" ") + "\n";
    }

    return fullText;

  } catch (err) {
    console.error("❌ PDF extract error:", err);
    return "Resume is private or unreadable.";
  }
}


// ------------------------------------------------------
// Chat Bubble
// ------------------------------------------------------
function appendMessage(msg) {
  const chat = document.getElementById("assistantChat");

  const bubble = document.createElement("div");
  bubble.className = "assistant-message";
  bubble.innerText = msg;

  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}


// ------------------------------------------------------
// Main AI Function
// ------------------------------------------------------
async function askAI(action) {

  appendMessage("🤖 Thinking...");

  try {
    await loadJobDetails();
    await loadUserProfile();

    // Resume extraction
    if (userProfile.resumeURL) {
      resumeText = await extractResumePDF(userProfile.resumeURL);
    } else {
      resumeText = "User has no resume uploaded.";
    }

    const prompts = {
      analyse: "Analyze this job profile deeply and summarize key insights.",
      fit: "Evaluate whether I fit this job. Provide a fit score and justification.",
      lack: "Identify missing skills or requirements I lack.",
      plan: "Create a full learning and preparation roadmap for this job.",
      enhance: "Suggest improvements for resume + profile."
    };

    const prompt = `
You are an AI placement assistant.

### JOB DETAILS:
${JSON.stringify(currentJobData, null, 2)}

### USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

### USER RESUME TEXT:
${resumeText.substring(0, 2500)}

### TASK:
${prompts[action]}
    `;

    // Gemini API Call
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json();

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI could not generate a response.";

    appendMessage(output);

  } catch (err) {
    console.error(err);
    appendMessage("❌ Something went wrong with AI request.");
  }
}


// ------------------------------------------------------
// Auto-load profile + job
// ------------------------------------------------------
window.addEventListener("load", async () => {
  await loadJobDetails();
  await loadUserProfile();
});

// Expose to HTML buttons
window.askAI = askAI;
