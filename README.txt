How to use the static demo site:
1. Unzip the archive and open index.html in your browser (Chrome recommended).
2. Student Login -> fill name/college/branch -> Create account.
3. First-time users go to Profile page to save additional info.
4. Apply to jobs via Apply -> Details -> Apply. Applications saved to localStorage.
5. Export profile & applications via Export buttons (CSV/JSON) for Excel.

Data storage:
- hl_user : JSON string in localStorage (student profile)
- hl_apps : JSON array in localStorage (applications)

To clear demo data, open browser Console and run:
localStorage.removeItem('hl_user'); localStorage.removeItem('hl_apps'); localStorage.removeItem('hl_seen_profile');

Notes:
- No backend, no Firebase. Everything local and offline.
- Files included: HTML pages, styles.css, app.js. Open index.html to start.
