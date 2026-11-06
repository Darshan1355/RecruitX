const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const app = require('./app');
const { initDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required. Copy server/.env.example to server/.env and configure it.');
    }
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
