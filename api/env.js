export default function handler(req, res) {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    window.VITE_FIREBASE_API_KEY = "${process.env.VITE_FIREBASE_API_KEY}";
  `);
}
