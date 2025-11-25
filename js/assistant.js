import { db, auth } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// PDF.js worker url
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// MODELS & API KEY
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
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

// ---------- Resume extraction ----------
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

// ---------- Prompt building ----------
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
  const nonATSRules = `
Rules (NON-ATS outputs):
- DO NOT use markdown tables, pipes (|) or ':---' aligners.
- DO NOT use complex markdown table syntaxes.
- Provide short sections using headings and simple bullet lists (use '-' for bullets).
- Avoid long paragraphs; keep outputs concise and structured.
- Keep outputs plain (no HTML).
`;

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
Generate ATS-optimized resume keywords that are PERSONALIZED to the student's resume and this job.

Procedure:
1. Extract meaningful technical and soft keywords FROM THE RESUME.
2. Extract required skills FROM THE JOB DESCRIPTION.
3. Compare and produce 3 exact comma-separated lists:

Present in Resume:
<comma-separated keywords>

Missing but Required:
<comma-separated keywords>

Recommended Additions:
<comma-separated keywords>

Rules:
- NO bullet lists, no paragraphs; ONLY the 3 labeled lines above.
- Personalization is mandatory (reflect the resume).
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

${action === "ats" ? "" : nonATSRules}
  `;
}

function convertMarkdownTable(text) {
  const lines = String(text).split("\n");

  if (
    lines.length >= 2 &&
    /^\s*\|(.+)\|\s*$/.test(lines[0]) &&
    /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(lines[1])
  ) {
    const header = lines[0].split("|").filter(x => x.trim());
    const body = lines.slice(2);
    let html = "<div class='table-wrap'><table class='ai-table'><thead><tr>";
    header.forEach(col => html += `<th>${escapeHtml(col.trim())}</th>`);
    html += "</tr></thead><tbody>";
    body.forEach(row => {
      if (!row.includes("|")) return;
      const cols = row.split("|").filter(x => x.trim());
      html += "<tr>";
      cols.forEach(col => html += `<td>${escapeHtml(col.trim())}</td>`);
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  return String(text).replace(/\|/g, " ");
}

function mdToHtml(txt) {
  const raw = String(txt || "");
  let safe = raw.replace(/\r\n/g, "\n");

  safe = safe.replace(/^\s*[\*\u2022]\s+/gim, "- ");

  let html = safe
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/^- (.*)$/gim, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");

  if (html.includes("|") && !raw.includes("<table")) {
    html = convertMarkdownTable(html);
  }

  html = html.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  return html;
}

// ---------- Resume keyword extraction ----------
function extractResumeKeywords(text) {
  if (!text) return [];
  const t = String(text).toLowerCase();
  const stop = new Set(["and","with","in","on","the","a","an","of","for","to","by","using","experience","project","projects","work","internship","responsible","degree","education","btech","be","mtech","msc","expected","year"]);
  const tokenCandidates = t.match(/[a-z0-9\+\#\.\/\-\_]{2,}/g) || [];
  const counts = {};
  for (let tok of tokenCandidates) {
    tok = tok.replace(/^[^\w\+#\.]+|[^\w\+#\.]+$/g, "");
    if (!tok || tok.length < 2) continue;
    if (stop.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    counts[tok] = (counts[tok] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  return Array.from(new Set(sorted)).slice(0, 400);
}

function parsePersonalizedATS(text) {
  const output = { present: [], missing: [], recommended: [] };
  if (!text) return output;
  const cleaned = String(text).replace(/\r\n/g, "\n").trim();
  function extract(label) {
    const re = new RegExp(label + "\\s*:\\s*([\\s\\S]*?)(\\n\\n|$)", "i");
    const m = cleaned.match(re);
    if (!m) return [];
    return m[1].split(/,|\n/).map(x => x.trim()).filter(Boolean);
  }
  output.present = extract("Present in Resume");
  output.missing = extract("Missing but Required");
  output.recommended = extract("Recommended Additions");
  return output;
}

function keywordInResume(keyword, resumeKeywords) {
  if (!keyword) return false;
  const k = String(keyword).toLowerCase().trim();
  for (const rk of (resumeKeywords||[])) {
    const r = String(rk).toLowerCase();
    if (r === k) return true;
    if (r.includes(k) || k.includes(r)) return true;
  }
  return false;
}

function renderPersonalizedATS(outputText, resumeKeywords) {
  const parsed = parsePersonalizedATS(outputText);
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";

  function makeChipBlock(title, items, type) {
    if (!items || !items.length) return null;
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
    items.forEach((raw) => {
      const item = String(raw).trim();
      if (!item) return;
      const chip = document.createElement("span");
      chip.className = "ai-chip";
      const present = keywordInResume(item, resumeKeywords || []);
      chip.textContent = item;
      chip.title = present ? "Present in resume" : "Not found in resume";
      if (present) {
        chip.style.background = "#ecfdf5";
        chip.style.color = "#065f46";
        chip.style.border = "1px solid #bbf7d0";
      } else {
        chip.style.background = "#fff7ed";
        chip.style.color = "#92400e";
        chip.style.border = "1px solid #ffd8a8";
      }
      chip.style.padding = "6px 10px";
      chip.style.borderRadius = "999px";
      chip.style.fontSize = "13px";
      chip.style.display = "inline-block";
      chipBox.appendChild(chip);
    });
    wrap.appendChild(chipBox);
    return wrap;
  }

  const presentBlock = makeChipBlock("Present in Resume", parsed.present, "present");
  const missingBlock = makeChipBlock("Missing but Required", parsed.missing, "missing");
  const recBlock = makeChipBlock("Recommended Additions", parsed.recommended, "recommended");

  const summary = document.createElement("div");
  summary.style.fontSize = "13px";
  summary.style.color = "#475569";
  const presentCount = (parsed.present || []).length;
  const missingCount = (parsed.missing || []).length;
  const recCount = (parsed.recommended || []).length;
  summary.textContent = `Present: ${presentCount} • Missing (required): ${missingCount} • Recommended: ${recCount}`;
  container.appendChild(summary);

  if (presentBlock) container.appendChild(presentBlock);
  if (missingBlock) container.appendChild(missingBlock);
  if (recBlock) container.appendChild(recBlock);

  return container;
}

function renderAIOutputSupplement(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();
  const hasTools = /tools used|tools:|technologies:|tech stack/i.test(lower);
  const hasCommonQ = /common questions|frequent questions|interview questions/i.test(lower);
  const hasHiring = /hiring pattern|hiring process|rounds|interview rounds/i.test(lower);
  const hasPackage = /package|salary|lpa|ctc|compensation/i.test(lower);

  if (!(hasTools || hasCommonQ || hasHiring || hasPackage)) return null;
  if (text.includes("<table")) return null;

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let current = null;
  const toolLines = [], questionLines = [], hiringLines = [], packageLines = [];

  for (let raw of lines) {
    let line = raw.replace(/^[\*\-\u2022\•\s]+/, "").trim();
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
    tools.slice(0, 20).forEach(t => { const sp = document.createElement("span"); sp.className = "ai-chip"; sp.textContent = t; sp.style.padding="6px 10px"; sp.style.borderRadius="999px"; sp.style.background="#eef2ff"; sp.style.color="#0b63d8"; chips.appendChild(sp); });
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
      const parts = line.split(/:|-\u2014|—|-/).map(s => s.trim());
      const key = parts[0] || "Info";
      const val = parts.slice(1).join(" - ") || "";
      tr.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(val)}</td>`;
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
  bubble.style.maxWidth = "100%";
  bubble.innerHTML = `<span class="typing"><span class="dots"><span></span><span></span><span></span></span>  Generating...</span>`;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}
function hideTyping() { const el = document.getElementById("typingBubble"); if (el) el.remove(); }

function appendMessage(msg, { isError = false, action = null } = {}) {
  const chat = document.getElementById("assistantChat");
  if (!chat) {
    console.warn("No #assistantChat element found to append message.");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message";
  wrapper.style.maxWidth = "100%";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.wordBreak = "break-word";
  wrapper.style.whiteSpace = "normal";
  wrapper.style.overflowWrap = "break-word";

  if (isError) {
    wrapper.style.background = "#fee2e2";
    wrapper.style.color = "#991b1b";
    wrapper.textContent = String(msg);
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
    return;
  }

  const msgStr = String(msg || "");

  if (action === "ats") {
    const resumePlain = resumeText || (userProfile && userProfile.resumeText) || "";
    const resumeKeywords = extractResumeKeywords(resumePlain);
    const atsUI = renderPersonalizedATS(msgStr, resumeKeywords);
    wrapper.appendChild(atsUI);
    chat.appendChild(wrapper);
    setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 40);
    return;
  }

  if (msgStr.includes("<table")) {
    wrapper.innerHTML = msgStr;
    chat.appendChild(wrapper);
    setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 40);
    return;
  }

  const mainHtml = mdToHtml(msgStr);
  const mainDiv = document.createElement("div");
  mainDiv.style.width = "100%";
  mainDiv.style.marginBottom = "8px";
  mainDiv.innerHTML = mainHtml;
  wrapper.appendChild(mainDiv);

  const supplement = renderAIOutputSupplement(msgStr);
  if (supplement) {
    const hr = document.createElement("div");
    hr.style.height = "1px";
    hr.style.background = "#eef2ff";
    hr.style.margin = "8px 0";
    wrapper.appendChild(hr);
    wrapper.appendChild(supplement);
  }

  chat.appendChild(wrapper);
  setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 50);
}

// ---------- callGemini (retry/backoff + fallback model) ----------
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
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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

    const output = (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text)
      ? data.candidates[0].content.parts[0].text
      : "⚠️ AI could not generate a response.";

    if (action === "ats") {
      const resumePlain = resumeText || (userProfile && userProfile.resumeText) || "";
      const resumeKeywords = extractResumeKeywords(resumePlain);
      const chat = document.getElementById("assistantChat");
      const wrapper = document.createElement("div");
      wrapper.className = "assistant-message";
      wrapper.style.maxWidth = "100%";
      const atsUI = renderPersonalizedATS(output, resumeKeywords);
      wrapper.appendChild(atsUI);
      chat.appendChild(wrapper);
      setTimeout(() => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }), 50);
      return output;
    }

    appendMessage(output, { action });
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
