const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('../utils/aiClient');
const { query, get, run, addNotification } = require('../config/db');

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

exports.uploadResumes = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No resume files uploaded.' });
    }

    const results = [];

    for (const file of files) {
      const fileBytes = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

      // Duplicate check for this user
      const existing = await get(
        'SELECT id, filename FROM resumes WHERE user_id = ? AND file_hash = ?',
        [userId, fileHash]
      );

      if (existing) {
        results.push({
          filename: file.originalname,
          status: 'duplicate',
          message: `Already uploaded as ${existing.filename} (ID: ${existing.id})`
        });
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        continue;
      }

      const resumeId = `res_${Math.random().toString(36).substring(2, 9)}`;
      const candidateId = `cand_${Math.random().toString(36).substring(2, 9)}`;
      const vectorId = `resume_${Math.random().toString(36).substring(2, 12)}`;
      const fileSizeKb = parseFloat((file.size / 1024).toFixed(1));

      let aiData = null;
      try {
        const extResp = await axios.post(`${AI_URL}/api/ai/extract`, {
          file_path: file.path
        });
        if (extResp.data && extResp.data.success) {
          aiData = extResp.data.data;
        }
      } catch (aiErr) {
        console.warn(`Extraction error for ${file.originalname}:`, aiErr.message);
      }

      const pageCount = aiData ? aiData.page_count : 1;
      const fullName = aiData ? aiData.full_name : path.parse(file.originalname).name;
      const skills = aiData ? aiData.skills : [];
      const expYears = aiData ? aiData.years_of_experience : 2.0;

      // 1. Insert into resumes table
      await run(`
        INSERT INTO resumes (id, user_id, filename, file_path, file_hash, file_size_kb, page_count, processing_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [resumeId, userId, file.originalname, file.path, fileHash, fileSizeKb, pageCount, 'indexed']);

      // 2. Insert candidate structured record
      await run(`
        INSERT INTO candidates (
          id, user_id, resume_id, vector_id, full_name, email, phone, location,
          years_of_experience, summary, skills_json, education_json, experience_json,
          projects_json, certifications_json, internships_json, technical_artifacts_json,
          achievements_json, talent_dna_json, is_shortlisted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        candidateId,
        userId,
        resumeId,
        vectorId,
        fullName,
        aiData ? aiData.email : 'N/A',
        aiData ? aiData.phone : 'N/A',
        aiData ? aiData.location : 'Remote / Open',
        expYears,
        aiData ? aiData.summary : 'Uploaded Candidate Resume',
        JSON.stringify(skills),
        JSON.stringify(aiData ? aiData.education : []),
        JSON.stringify(aiData ? aiData.experience : []),
        JSON.stringify(aiData ? aiData.projects : []),
        JSON.stringify(aiData ? aiData.certifications : []),
        JSON.stringify(aiData ? aiData.internships : []),
        JSON.stringify(aiData ? aiData.technical_artifacts : []),
        JSON.stringify(aiData ? aiData.achievements : []),
        JSON.stringify(aiData ? aiData.talent_dna : {}),
        0
      ]);

      // 3. Store citations
      if (aiData && aiData.evidence_citations && aiData.evidence_citations.length > 0) {
        for (const ev of aiData.evidence_citations) {
          const evId = `ev_${Math.random().toString(36).substring(2, 9)}`;
          await run(`
            INSERT INTO evidence_citations (id, candidate_id, skill_or_claim, page_number, evidence_quote, context)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [evId, candidateId, ev.skill_or_claim, ev.page_number, ev.evidence_quote, ev.context]);
        }
      }

      // 4. Index into ChromaDB vector database
      if (aiData && aiData.raw_text) {
        try {
          await axios.post(`${AI_URL}/api/ai/index`, {
            vector_id: vectorId,
            text: aiData.raw_text,
            metadata: {
              source: file.originalname,
              filename: file.originalname,
              user_id: userId,
              skills: skills.slice(0, 20).join(', ')
            }
          });
        } catch (vecErr) {
          console.warn('Vector indexing warning:', vecErr.message);
        }
      }

      // Record notification
      await addNotification(
        userId,
        'Resume Processed & Indexed',
        `"${file.originalname}" successfully parsed (${fullName}, ${skills.length} skills).`,
        'success'
      );

      results.push({
        resume_id: resumeId,
        candidate_id: candidateId,
        filename: file.originalname,
        candidate_name: fullName,
        status: 'indexed',
        skills_count: skills.length
      });
    }

    res.status(201).json({
      message: 'Upload processing completed',
      results
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

exports.getResumes = async (req, res) => {
  try {
    const userId = req.user.id;
    const resumes = await query(`
      SELECT r.*, c.id as candidate_id, c.full_name as candidate_name, c.years_of_experience, c.skills_json, c.is_shortlisted
      FROM resumes r
      LEFT JOIN candidates c ON r.id = c.resume_id
      WHERE r.user_id = ?
      ORDER BY r.uploaded_at DESC
    `, [userId]);

    const formatted = resumes.map(r => ({
      ...r,
      skills: JSON.parse(r.skills_json || '[]')
    }));

    res.json({ resumes: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resumes: ' + err.message });
  }
};

exports.getResumeById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const resume = await get(`
      SELECT r.*, c.id as candidate_id, c.full_name as candidate_name, c.skills_json
      FROM resumes r
      LEFT JOIN candidates c ON r.id = c.resume_id
      WHERE (r.id = ? OR c.id = ?) AND r.user_id = ?
    `, [id, id, userId]);

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found or unauthorized' });
    }

    resume.skills = JSON.parse(resume.skills_json || '[]');
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume: ' + err.message });
  }
};

exports.downloadResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const resume = await get(
      'SELECT file_path, filename FROM resumes WHERE (id = ? OR id IN (SELECT resume_id FROM candidates WHERE id = ?)) AND user_id = ?',
      [id, id, userId]
    );

    if (!resume || !fs.existsSync(resume.file_path)) {
      return res.status(404).json({ error: 'Resume file not found.' });
    }

    res.download(resume.file_path, resume.filename);
  } catch (err) {
    res.status(500).json({ error: 'Download failed: ' + err.message });
  }
};

exports.streamResumeFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const resume = await get(
      'SELECT file_path, filename FROM resumes WHERE (id = ? OR id IN (SELECT resume_id FROM candidates WHERE id = ?)) AND user_id = ?',
      [id, id, userId]
    );

    if (!resume || !fs.existsSync(resume.file_path)) {
      return res.status(404).json({ error: 'Resume document file not found on disk.' });
    }

    const ext = path.extname(resume.filename).toLowerCase();

    // If DOCX/DOC, convert to clean HTML preview via Python AI service
    if (ext === '.docx' || ext === '.doc') {
      try {
        const previewResp = await axios.post(`${AI_URL}/api/ai/preview-docx`, {
          file_path: resume.file_path
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(previewResp.data);
      } catch (docErr) {
        console.warn('DOCX conversion fallback:', docErr.message);
        // Fallback to text download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.filename)}"`);
        return fs.createReadStream(resume.file_path).pipe(res);
      }
    }

    // Default: PDF Stream with inline display headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.filename)}"`);
    fs.createReadStream(resume.file_path).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stream resume file: ' + err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const resume = await get(
      'SELECT r.*, c.vector_id, c.id as candidate_id FROM resumes r LEFT JOIN candidates c ON r.id = c.resume_id WHERE r.id = ? AND r.user_id = ?',
      [id, userId]
    );

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found or unauthorized.' });
    }

    // 1. Delete physical file from disk
    if (resume.file_path && fs.existsSync(resume.file_path)) {
      try {
        fs.unlinkSync(resume.file_path);
      } catch (fileErr) {
        console.warn('Could not delete physical file:', fileErr.message);
      }
    }

    // 2. Delete ChromaDB vector embedding permanently
    if (resume.vector_id) {
      try {
        await axios.post(`${AI_URL}/api/ai/delete-vector`, {
          vector_id: resume.vector_id
        });
      } catch (vecErr) {
        console.warn('Could not delete ChromaDB vector:', vecErr.message);
      }
    }

    // 3. Delete evidence citations
    if (resume.candidate_id) {
      await run('DELETE FROM evidence_citations WHERE candidate_id = ?', [resume.candidate_id]);
      await run('DELETE FROM candidates WHERE id = ?', [resume.candidate_id]);
    }

    // 4. Delete resume record in SQL
    await run('DELETE FROM resumes WHERE id = ?', [id]);

    await addNotification(
      userId,
      'Resume Deleted',
      `"${resume.filename}" and its vector representations were permanently deleted.`,
      'info'
    );

    res.json({
      message: 'Resume and all associated vectors, candidate data, and evidence citations permanently deleted.',
      deleted_id: id
    });
  } catch (err) {
    console.error('Delete resume error:', err);
    res.status(500).json({ error: 'Failed to delete resume: ' + err.message });
  }
};
