import { db, auth } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// Models + (FRONTEND) API KEY
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-pro-latest";
const GEMINI_API_KEY = "AIzaSyCpvWjeqzQfwDm3PNgn7HF051pIfhul-_8";

let jobData = null;
let userProfile = null;
let resumeText = "";
let pageLoaded = false;  
let aiBusy = false;      

// -------------------- UI Helpers --------------------
function appendMessage(msg, { isError = false } = {}) {
  const chat = document.getElementById("assistantChat");
  if (!chat) {
    console.warn("No #assistantChat element found to append message.");
    return;
  }
  const bubble = document.createElement("div");
  bubble.className = isError ? "assistant-message error" : "assistant-message";

  let html = String(msg);

  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/^- (.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");
  if (html.includes("|")) {
    html = convertMarkdownTable(html);
  }
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
  if (!chat) return;
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

// -------------------- Data Loading --------------------
async function loadJob() {
  if (jobData) return;
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id");
  if (!jobId) return;
  try {
    const snap = await getDoc(doc(db, "jobs", jobId));
    if (snap.exists()) jobData = snap.data();
    else jobData = null;
  } catch (err) {
    console.warn("Error loading job:", err);
    jobData = null;
  }
}

function loadProfile() {
  if (userProfile !== null) return Promise.resolve(); 
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        userProfile = null;
        return resolve();
      }
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (snap.exists()) userProfile = snap.data();
        else userProfile = null;
        resolve();
      } catch (err) {
        console.warn("Error loading profile:", err);
        userProfile = null;
        resolve();
      }
    });
  });
}

// -------------------- Resume Extraction --------------------
async function extractPDF(url) {
  if (!url) return "No resume URL provided.";
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    let finalText = "";
    const maxPages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      finalText += text.items.map((a) => a.str).join(" ") + "\n\n";
      await new Promise((r) => setTimeout(r, 10));
    }
    return finalText;
  } catch (err) {
    console.warn("⚠️ Error extracting resume:", err);
    return "Resume could not be extracted.";
  }
}

// -------------------- Prompt / Size Helpers --------------------
function shallowSummarize(obj, maxChars = 1000) {
  if (!obj) return null;
  try {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string") out[k] = v.slice(0, 250);
      else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
      else if (Array.isArray(v)) out[k] = v.slice(0, 5).map((x) => (typeof x === "string" ? x.slice(0, 120) : x));
      else if (typeof v === "object" && v !== null) {
        out[k] = Object.fromEntries(
          Object.entries(v).slice(0, 5).map(([ik, iv]) => [ik, typeof iv === "string" ? iv.slice(0, 120) : iv])
        );
      } else {
        out[k] = null;
      }
    }
    const str = JSON.stringify(out);
    return str.length > maxChars ? str.slice(0, maxChars) + "..." : str;
  } catch (err) {
    return null;
  }
}

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

  const jobSummary = shallowSummarize(jobData, 1200) || "No job data available.";
  const profileSummary = shallowSummarize(userProfile, 1200) || "No profile data available.";

  const resumeSnippet = (resumeText || "").replace(/\s+/g, " ").trim().slice(0, 1200);

  return `
You are a world-class Placement Assistant. Keep the output crisp, structured, and actionable. Avoid fluff.

### JOB SUMMARY:
${jobSummary}

### STUDENT PROFILE SUMMARY:
${profileSummary}

### RESUME SNIPPET:
${resumeSnippet}

### TASK:
${taskMap[action]}
  `;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffDelay(attempt, base = 500) {
  const exp = Math.pow(2, attempt) * base;
  const jitter = Math.floor(Math.random() * (exp * 0.5));
  return exp + jitter;
}

//callGemini - improved fetch with handling for 429 / 503 and fallback model

async function callGemini(prompt, model = PRIMARY_MODEL, maxAttempts = 5) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  let attempt = 0;
  let lastErr = null;

  while (attempt < maxAttempts) {
    try {
      if (attempt > 0) {
        const d = backoffDelay(attempt - 1, 500);
        console.warn(`Retry attempt #${attempt} after ${d}ms (model=${model})`);
        await sleep(d);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (res.ok) {
        const json = await res.json();
        return json;
      }

      if (res.status === 429) {
        lastErr = new Error("429 Too Many Requests");
        console.warn("Received 429 from Gemini API — backing off and retrying.");
        attempt++;
        continue;
      }

      if (res.status === 503) {
        lastErr = new Error("503 Service Unavailable");
        console.warn("Received 503 from Gemini API — backing off and retrying.");
        attempt++;
        continue;
      }

      const bodyText = await res.text();
      lastErr = new Error(`HTTP ${res.status}: ${bodyText}`);
      console.error("Gemini returned non-OK:", res.status, bodyText);

      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;

      attempt++;
    } catch (err) {
      lastErr = err;
      console.warn("Network error calling Gemini:", err);
      attempt++;
    }
  }

  if (model !== FALLBACK_MODEL) {
    console.warn("Falling back to fallback model:", FALLBACK_MODEL);
    return callGemini(prompt, FALLBACK_MODEL, Math.max(1, Math.floor(maxAttempts / 2)));
  }

  throw lastErr || new Error("Gemini request failed after retries.");
}

async function askAI(action) {
  if (aiBusy) {
    appendMessage("⚠️ Please wait — AI is still processing the previous request.");
    return;
  }
  aiBusy = true;
  showTyping();

  try {
    if (!pageLoaded) {
      await loadJob();
      await loadProfile();
      pageLoaded = true;
    }

    if (!resumeText && userProfile?.resumeURL) {
      appendMessage("🔎 Extracting resume (first 10 pages, trimmed)...");
      resumeText = await extractPDF(userProfile.resumeURL);
    }

    const prompt = buildPrompt(action);

    // Call Gemini with improved retry/handling
    const data = await callGemini(prompt, PRIMARY_MODEL, 6);

    hideTyping();
    aiBusy = false;

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ AI could not generate a response.";

    appendMessage(output);
    return output;
  } catch (err) {
    hideTyping();
    aiBusy = false;

    console.error("askAI error:", err);
    appendMessage("❌ Something went wrong while contacting the AI. Try again later.", { isError: true });
    if (err && /429|Too Many Requests/i.test(String(err))) {
      appendMessage("⚠️ Rate limit reached. Consider migrating Gemini calls to a backend or reducing frequency.", { isError: true });
    }
    return null;
  }
}

window.askAI = askAI;

// Ensure job/profile loaded on page load once
window.addEventListener("load", async () => {
  try {
    await loadJob();
    await loadProfile();
  } catch (err) {
    console.warn("Initial load error:", err);
  } finally {
    pageLoaded = true;
  }
});
