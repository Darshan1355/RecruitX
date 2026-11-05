const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/talentiq.sqlite3');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisified helpers
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize schema
const initDB = async () => {
  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'recruiter',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Resumes table
  await run(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_hash TEXT,
      file_size_kb REAL,
      page_count INTEGER DEFAULT 1,
      processing_status TEXT DEFAULT 'indexed',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Candidates table
  await run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resume_id TEXT,
      vector_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      location TEXT,
      years_of_experience REAL DEFAULT 0,
      summary TEXT,
      skills_json TEXT DEFAULT '[]',
      education_json TEXT DEFAULT '[]',
      experience_json TEXT DEFAULT '[]',
      projects_json TEXT DEFAULT '[]',
      talent_dna_json TEXT DEFAULT '{}',
      is_shortlisted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
    )
  `);

  // Evidence Citations table
  await run(`
    CREATE TABLE IF NOT EXISTS evidence_citations (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      skill_or_claim TEXT NOT NULL,
      page_number INTEGER DEFAULT 1,
      evidence_quote TEXT NOT NULL,
      context TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);

  // Copilot Conversations table
  await run(`
    CREATE TABLE IF NOT EXISTS copilot_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Copilot Messages table
  await run(`
    CREATE TABLE IF NOT EXISTS copilot_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      candidate_references_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES copilot_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Interview Sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      job_role TEXT NOT NULL,
      interview_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);

  // Saved Comparisons table
  await run(`
    CREATE TABLE IF NOT EXISTS saved_comparisons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      candidate_ids_json TEXT NOT NULL,
      comparison_data_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Notifications table
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Safe schema migrations for candidate details & interview PDF paths
  const safeAddColumn = async (table, colDef) => {
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    } catch (e) {
      // Column already exists
    }
  };

  await safeAddColumn('candidates', 'certifications_json TEXT DEFAULT "[]"');
  await safeAddColumn('candidates', 'internships_json TEXT DEFAULT "[]"');
  await safeAddColumn('candidates', 'technical_artifacts_json TEXT DEFAULT "[]"');
  await safeAddColumn('candidates', 'achievements_json TEXT DEFAULT "[]"');
  await safeAddColumn('interview_sessions', 'pdf_path TEXT');
  await safeAddColumn('interview_sessions', 'status TEXT DEFAULT "Completed"');

  // Seed default demo user if empty
  const admin = await get(`SELECT * FROM users WHERE email = ?`, ['admin@talentiq.ai']);
  let defaultUserId = admin ? admin.id : 'usr_admin_default';

  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin@1234', salt);
    await run(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      ['usr_admin_default', 'TalentIQ Lead Recruiter', 'admin@talentiq.ai', hash, 'admin']
    );
    console.log('Seeded default user: admin@talentiq.ai / Admin@1234');
  }

  // Pre-seed candidates from existing sample data if candidates table is empty
  const candidateCount = await get(`SELECT COUNT(*) as count FROM candidates`);
  if (candidateCount.count === 0) {
    console.log('Synchronizing initial candidate records from ChromaDB and sample resumes...');
    await syncInitialCandidates(defaultUserId);
  }
};

const syncInitialCandidates = async (defaultUserId) => {
  const sampleFolder = path.resolve(__dirname, '../../../sample_data');
  if (!fs.existsSync(sampleFolder)) return;

  const axios = require('axios');
  const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

  const files = fs.readdirSync(sampleFolder).filter(f => f.endsWith('.pdf'));
  for (const f of files) {
    const filePath = path.join(sampleFolder, f);
    try {
      // Call python AI extraction endpoint
      const resp = await axios.post(`${AI_URL}/api/ai/extract`, { file_path: filePath });
      if (resp.data && resp.data.success) {
        const details = resp.data.data;
        const resumeId = `res_${Math.random().toString(36).substring(2, 9)}`;
        const candidateId = `cand_${Math.random().toString(36).substring(2, 9)}`;
        const vectorId = `resume_${Math.random().toString(36).substring(2, 12)}`;

        // Insert resume
        await run(`
          INSERT INTO resumes (id, user_id, filename, file_path, file_size_kb, page_count, processing_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [resumeId, defaultUserId, f, filePath, 130.0, details.page_count || 2, 'indexed']);

        // Insert candidate
        await run(`
          INSERT INTO candidates (
            id, user_id, resume_id, vector_id, full_name, email, phone, location,
            years_of_experience, summary, skills_json, education_json, experience_json,
            projects_json, talent_dna_json, is_shortlisted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          candidateId,
          defaultUserId,
          resumeId,
          vectorId,
          details.full_name,
          details.email,
          details.phone,
          details.location,
          details.years_of_experience,
          details.summary,
          JSON.stringify(details.skills || []),
          JSON.stringify(details.education || []),
          JSON.stringify(details.experience || []),
          JSON.stringify(details.projects || []),
          JSON.stringify(details.talent_dna || {}),
          0
        ]);

        // Insert evidence citations
        if (details.evidence_citations && details.evidence_citations.length > 0) {
          for (const ev of details.evidence_citations) {
            const evId = `ev_${Math.random().toString(36).substring(2, 9)}`;
            await run(`
              INSERT INTO evidence_citations (id, candidate_id, skill_or_claim, page_number, evidence_quote, context)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [evId, candidateId, ev.skill_or_claim, ev.page_number, ev.evidence_quote, ev.context]);
          }
        }
      }
    } catch (err) {
      console.warn(`Could not auto-seed ${f}:`, err.message);
    }
  }
};

const addNotification = async (userId, title, message, type = 'info') => {
  try {
    const id = `notif_${Math.random().toString(36).substring(2, 9)}`;
    await run(
      'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [id, userId, title, message, type]
    );
    return id;
  } catch (err) {
    console.warn('Could not insert notification:', err.message);
    return null;
  }
};

module.exports = {
  db,
  query,
  get,
  run,
  initDB,
  addNotification
};
