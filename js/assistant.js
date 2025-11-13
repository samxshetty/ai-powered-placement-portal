// =====================================================
//  Placement Assistant — Version C (Robust, Stable)
// =====================================================

import { db, auth } from "./firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// ---------------------------------------
// Gemini Models (Primary + Fallback)
// ---------------------------------------
const PRIMARY_MODEL = "gemini-flash-latest";   // Most stable, fast, free
const FALLBACK_MODEL = "gemini-pro-latest";    // Backup if flash fails

const GEMINI_API_KEY = "AIzaSyCpvWjeqzQfwDm3PNgn7HF051pIfhul-_8";

let jobData = {};
let userProfile = {};
let resumeText = "";

// ------------------------------------------------------
// Chat UI Helpers
// ------------------------------------------------------
function appendMessage(msg) {
  const chat = document.getElementById("assistantChat");
  const bubble = document.createElement("div");
  bubble.className = "assistant-message";

  let html = msg;

  // Headings
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");

  // Bullet points
  html = html.replace(/^- (.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");

  // Convert tables
  if (html.includes("|")) {
    html = convertMarkdownTable(html);
  }

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  bubble.innerHTML = html;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function convertMarkdownTable(text) {
  const tableRegex = /\|(.+\|)+/g;
  const tables = text.match(tableRegex);

  if (!tables) return text;

  tables.forEach((table) => {
    let rows = table.trim().split("\n").filter(r => r.includes("|"));

    // Remove second row separator
    if (rows.length > 1 && rows[1].includes("---")) {
      rows.splice(1, 1);
    }

    let htmlTable = "<table>";

    rows.forEach((row, index) => {
      const cols = row.split("|").filter(Boolean);
      htmlTable += "<tr>";

      cols.forEach((col) => {
        if (index === 0)
          htmlTable += `<th>${col.trim()}</th>`;
        else
          htmlTable += `<td>${col.trim()}</td>`;
      });

      htmlTable += "</tr>";
    });

    htmlTable += "</table>";

    text = text.replace(table, htmlTable);
  });

  return text;
}


function showTyping() {
  const chat = document.getElementById("assistantChat");
  const bubble = document.createElement("div");
  bubble.className = "assistant-message";
  bubble.id = "typingBubble";
  bubble.innerText = "🤖 Typing…";
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typingBubble");
  if (el) el.remove();
}

// ------------------------------------------------------
// Load Job
// ------------------------------------------------------
async function loadJob() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id");
  if (!jobId) return;

  const snap = await getDoc(doc(db, "jobs", jobId));
  if (snap.exists()) {
    jobData = snap.data();
  }
}

// ------------------------------------------------------
// Load Profile
// ------------------------------------------------------
async function loadProfile() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return resolve();
      const snap = await getDoc(doc(db, "profiles", user.uid));
      if (snap.exists()) userProfile = snap.data();
      resolve();
    });
  });
}

// ------------------------------------------------------
// Resume Extraction
// ------------------------------------------------------
async function extractPDF(url) {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    let finalText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      finalText += text.items.map((a) => a.str).join(" ") + "\n\n";
    }

    return finalText;
  } catch (err) {
    console.warn("⚠️ Error extracting resume:", err);
    return "Resume could not be extracted.";
  }
}

// ------------------------------------------------------
// Build HIGH QUALITY PROMPT
// ------------------------------------------------------
function buildPrompt(action) {
  const taskMap = {
    analyse: `
Give a structured analysis:
- Job Summary
- Required Skills
- Hidden Expectations
- Hiring Pattern
- Difficulty Rating
- What they truly want
    `,
    fit: `
Analyze student-job fit:
- Fit Score (0-100)
- Strengths
- Weaknesses
- Missing parts
- Should they apply?
    `,
    lack: `
List EXACT missing skills:
- Technical gaps
- Soft skills missing
- Tools inexperienced in
- Knowledge gaps
- Fix priority (rank 1–5)
    `,
    plan: `
Make a personalized roadmap:
- 30-day learning plan
- Skills to build
- Projects to make
- Resume changes
- Interview prep plan
    `,
    enhance: `
Improve student's profile:
- Resume corrections
- Project ideas
- LinkedIn improvements
- Portfolio improvements
- Skills to add
    `
  };

  return `
You are a world-class Placement Assistant. Keep the output crisp, structured, and actionable. Avoid fluff.

### JOB DATA:
${JSON.stringify(jobData, null, 2)}

### STUDENT PROFILE:
${JSON.stringify(userProfile, null, 2)}

### RESUME TEXT:
${resumeText.substring(0, 3500)}

### TASK:
${taskMap[action]}
  `;
}

// ------------------------------------------------------
// Gemini API Request with Retry + Fallback
// ------------------------------------------------------
async function callGemini(prompt, model = PRIMARY_MODEL, retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    // If overloaded → retry
    if (res.status === 503 && retries > 0) {
      console.warn(`⚠️ Gemini overloaded → retrying (${retries})`);
      await new Promise((r) => setTimeout(r, 1000));
      return callGemini(prompt, model, retries - 1);
    }

    // If still 503 → Use fallback model
    if (res.status === 503) {
      console.warn("⚠️ Switching to fallback model (gemini-pro-latest)");
      return callGemini(prompt, FALLBACK_MODEL, 2);
    }

    return await res.json();

  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️ Network error → retrying (${retries})`);
      await new Promise((r) => setTimeout(r, 800));
      return callGemini(prompt, model, retries - 1);
    }

    console.error("❌ Gemini failed:", err);
    throw err;
  }
}

// ------------------------------------------------------
// ASK AI (Main Function)
// ------------------------------------------------------
async function askAI(action) {
  showTyping();

  try {
    await loadJob();
    await loadProfile();

    if (!resumeText && userProfile.resumeURL) {
      resumeText = await extractPDF(userProfile.resumeURL);
    }

    const prompt = buildPrompt(action);
    const data = await callGemini(prompt);

    hideTyping();

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ AI could not generate a response.";

    appendMessage(output);

  } catch (err) {
    hideTyping();
    appendMessage("❌ Something went wrong.");
    console.error(err);
  }
}

// ------------------------------------------------------
// Autoload data
// ------------------------------------------------------
window.addEventListener("load", async () => {
  await loadJob();
  await loadProfile();
});

window.askAI = askAI;
