require('dotenv').config();
const app = require('./app');
const { initDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('[*] Initializing TalentIQ SQLite database...');
    await initDB();
    console.log('[*] Database initialized and verified.');

    app.listen(PORT, () => {
      console.log(`[🚀] TalentIQ Node.js Backend running on http://127.0.0.1:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
};

startServer();
