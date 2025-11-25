import { db, auth } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// Models +  API KEY - intentionally empty for security (insert at build time)
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-pro-latest";
const GEMINI_API_KEY = "";

let jobData = null;
let userProfile = null;
let resumeText = "";
let pageLoaded = false;
let aiBusy = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function backoffDelay(attempt, base = 500) {
  const exp = Math.pow(2, attempt) * base;
  const jitter = Math.floor(Math.random() * (exp * 0.5));
  return exp + jitter;
}

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

// -------------------- Prompt helpers --------------------
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
    `,
    ats: `
Generate ATS-optimized resume keywords specifically for THIS job role.

Return sections EXACTLY like this:

Hard Skills:
<comma-separated list>

Tools:
<comma-separated list>

Soft Skills:
<comma-separated list>

Rules:
- No bullet points.
- No explanations.
- ONLY comma-separated keywords.
- Tailored to job description, responsibilities, and hidden expectations.
`
  };

  const jobSummary = shallowSummarize(jobData, 1200) || "No job data available.";
  const profileSummary = shallowSummarize(userProfile, 1200) || "No profile data available.";
  const resumeSnippet = (resumeText || "").replace(/\s+/g, " ").trim().slice(0, 1200);

  const responseFormat = `
### RESPONSE FORMAT (MANDATORY FOR ATS):
If the requested task is ATS generation,
respond ONLY using:

Hard Skills:
skill1, skill2, skill3...

Tools:
tool1, tool2, tool3...

Soft Skills:
skill1, skill2, skill3...

Do NOT add any paragraph explanation.
`;

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

${action === "ats" ? responseFormat : ""}
  `;
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

function mdToHtml(txt) {
  let html = String(txt)
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/^- (.*)$/gim, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
  if (html.includes("|")) html = convertMarkdownTable(html);
  return html;
}

function renderATS(output) {
  if (!output || typeof output !== "string") return null;
  const lower = output.toLowerCase();
  if (!lower.includes("hard skills") && !lower.includes("hard skills:")) return null;

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";

  function makeChipBlock(title, items) {
    const wrap = document.createElement("div");
    wrap.className = "ai-card";
    const heading = document.createElement("h4");
    heading.textContent = title;
    heading.style.margin = "0 0 8px 0";
    wrap.appendChild(heading);

    const chipBox = document.createElement("div");
    chipBox.style.display = "flex";
    chipBox.style.flexWrap = "wrap";
    chipBox.style.gap = "8px";

    items.forEach((k) => {
      const chip = document.createElement("span");
      chip.className = "ai-chip";
      chip.textContent = k.trim();
      chip.title = k.trim();
      chipBox.appendChild(chip);
    });

    wrap.appendChild(chipBox);
    return wrap;
  }

  function extractBlock(label) {
    const regex = new RegExp(`${label}:([\\s\\S]*?)(\\n\\n|$)`, "i");
    const match = output.match(regex);
    if (!match) return [];
    return match[1]
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  const hardSkills = extractBlock("Hard Skills");
  const tools = extractBlock("Tools");
  const softSkills = extractBlock("Soft Skills");

  if (hardSkills.length) container.appendChild(makeChipBlock("Hard Skills", hardSkills));
  if (tools.length) container.appendChild(makeChipBlock("Tools", tools));
  if (softSkills.length) container.appendChild(makeChipBlock("Soft Skills", softSkills));

  return container;
}

function renderAIOutput(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();

  const hasTools = /tools used|tools:|technologies:|tech stack/i.test(lower);
  const hasCommonQ = /common questions|frequent questions|interview questions/i.test(lower);
  const hasHiring = /hiring pattern|hiring process|rounds|interview rounds/i.test(lower);
  const hasPackage = /package|salary|lpa|ctc|compensation/i.test(lower);

  if (!(hasTools || hasCommonQ || hasHiring || hasPackage)) return null;

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  let current = null;
  const toolLines = [], questionLines = [], hiringLines = [], packageLines = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (/^(tools|technologies|tech stack)[:\-\s]/i.test(lowerLine)) { current = "tools"; continue; }
    if (/^(common questions|frequent questions|interview questions|questions)[:\-\s]/i.test(lowerLine)) { current = "questions"; continue; }
    if (/^(hiring pattern|hiring process|rounds|interview rounds)[:\-\s]/i.test(lowerLine)) { current = "hiring"; continue; }
    if (/^(package|salary|compensation|ctc|lpa)[:\-\s]/i.test(lowerLine)) { current = "package"; continue; }

    if (current === "tools") toolLines.push(line);
    else if (current === "questions") questionLines.push(line);
    else if (current === "hiring") hiringLines.push(line);
    else if (current === "package") packageLines.push(line);
    else {
      if (/[\w-]+(js|python|react|node|aws|gcp|docker|kubernetes)/i.test(line)) toolLines.push(line);
      else if (/\b(question|q:)\b/i.test(line)) questionLines.push(line);
      else if (/\b(round|hr|tech|on-site|telephonic)\b/i.test(line)) hiringLines.push(line);
      else if (/\b(lpa|ctc|salary)\b/i.test(line)) packageLines.push(line);
    }
  }

  function makeCard(title, contentEl) {
    const c = document.createElement("div");
    c.className = "ai-card";
    const h = document.createElement("h4"); h.textContent = title; h.style.margin = "0 0 8px 0";
    c.appendChild(h);
    c.appendChild(contentEl);
    return c;
  }

  if (toolLines.length) {
    const tools = toolLines.join(" ").split(/,|\||;| and /i).map(s => s.trim()).filter(Boolean);
    const chips = document.createElement("div"); chips.style.display = "flex"; chips.style.flexWrap = "wrap"; chips.style.gap = "8px";
    tools.slice(0, 20).forEach(t => { const sp = document.createElement("span"); sp.className = "ai-chip"; sp.textContent = t; chips.appendChild(sp); });
    container.appendChild(makeCard("Tools & Technologies", chips));
  }

  if (questionLines.length) {
    const ol = document.createElement("ol"); ol.style.margin = "6px 0 0 16px";
    questionLines.slice(0, 8).forEach(q => { const li = document.createElement("li"); li.textContent = q.replace(/^\-*\s*/, ""); ol.appendChild(li); });
    container.appendChild(makeCard("Common Interview Questions", ol));
  }

  if (hiringLines.length) {
    const wrapper = document.createElement("div");
    hiringLines.slice(0, 6).forEach(l => { const p = document.createElement("div"); p.style.marginBottom = "6px"; p.textContent = l; wrapper.appendChild(p); });
    container.appendChild(makeCard("Hiring Pattern", wrapper));
  }

  if (packageLines.length) {
    const table = document.createElement("table"); table.className = "ai-table";
    const thead = document.createElement("thead"); thead.innerHTML = "<tr><th>Metric</th><th>Value</th></tr>"; table.appendChild(thead);
    const tbody = document.createElement("tbody");
    packageLines.slice(0,7).forEach(line => {
      const tr = document.createElement("tr");
      const parts = line.split(/:|-/).map(s => s.trim());
      const key = parts[0] || "Info";
      const val = parts.slice(1).join(" - ") || "";
      tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(makeCard("Package Insights", table));
  }

  return container;
}


function showTyping() {
  const chat = document.getElementById("assistantChat");
  if (!chat) return;
  if (document.getElementById("typingBubble")) return;
  const bubble = document.createElement("div");
  bubble.className = "assistant-message";
  bubble.id = "typingBubble";
  bubble.innerHTML = `<span class="typing"><span class="dots"><span></span><span></span><span></span></span>  Generating...</span>`;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById("typingBubble");
  if (el) el.remove();
}



function appendMessage(msg, { isError = false } = {}) {
  const chat = document.getElementById("assistantChat");
  if (!chat) {
    console.warn("No #assistantChat element found to append message.");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message";

  if (isError) {
    wrapper.style.background = "#fee2e2";
    wrapper.style.color = "#991b1b";
    wrapper.textContent = String(msg);
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
    return;
  }

  const atsRendered = renderATS(String(msg));
  if (atsRendered) {
    wrapper.innerHTML = "";
    wrapper.appendChild(atsRendered);
    chat.appendChild(wrapper);
    setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 50);
    return;
  }

  const visual = renderAIOutput(String(msg));
  if (visual) {
    wrapper.innerHTML = "";
    wrapper.appendChild(visual);
    chat.appendChild(wrapper);
    setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 50);
    return;
  }

  const html = mdToHtml(String(msg));
  wrapper.innerHTML = html;
  chat.appendChild(wrapper);
  setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 40);
}

async function callGemini(prompt, model = PRIMARY_MODEL, maxAttempts = 5) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key missing. Set GEMINI_API_KEY in assistant.js or use backend proxy.");
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
        }),
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

async function askAI(action, options = {}) {
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
      appendMessage("🔎 Analysing Profile & Resume...");
      resumeText = await extractPDF(userProfile.resumeURL);
    }

    const userQuery = options.userQuery ? `\n\nUSER QUERY: ${options.userQuery}` : "";

    const prompt = buildPrompt(action) + userQuery;

    const data = await callGemini(prompt, PRIMARY_MODEL, 6);

    hideTyping();
    aiBusy = false;

    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ AI could not generate a response.";

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

document.addEventListener("DOMContentLoaded", () => {
});

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
