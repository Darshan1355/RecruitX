const fs = require('fs');
const path = require('path');
const axios = require('../utils/aiClient');
const { query, get, run, addNotification } = require('../config/db');

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

exports.generateInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { candidate_id, job_role, interview_type, difficulty, count = 5 } = req.body;

    if (!candidate_id || !job_role) {
      return res.status(400).json({ error: 'candidate_id and job_role are required.' });
    }

    // Retrieve candidate's full structured profile from database
    const candidate = await get(
      `SELECT id, full_name, email, phone, location, years_of_experience, summary,
              skills_json, education_json, experience_json, projects_json,
              certifications_json, technical_artifacts_json, achievements_json
       FROM candidates
       WHERE id = ? AND user_id = ?`,
      [candidate_id, userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found or unauthorized' });
    }

    const candidateSkills = JSON.parse(candidate.skills_json || '[]');
    const candidateProjects = JSON.parse(candidate.projects_json || '[]');
    const candidateExperience = JSON.parse(candidate.experience_json || '[]');
    const candidateEducation = JSON.parse(candidate.education_json || '[]');
    const candidateCertifications = JSON.parse(candidate.certifications_json || '[]');

    // Call Python AI Interview Studio Generator with full candidate profile
    let generatedData = null;
    try {
      const intResp = await axios.post(`${AI_URL}/api/ai/interview`, {
        candidate_name: candidate.full_name,
        skills: candidateSkills,
        projects: candidateProjects,
        experience: candidateExperience,
        education: candidateEducation,
        certifications: candidateCertifications,
        job_role: job_role.trim(),
        interview_type: interview_type || 'Technical',
        difficulty: difficulty || 'All',
        count: parseInt(count, 10) || 5
      });
      if (intResp.data) {
        generatedData = intResp.data;
      }
    } catch (aiErr) {
      console.warn('AI interview generation error:', aiErr.message);
    }

    const sessionId = `int_${Math.random().toString(36).substring(2, 9)}`;
    const questions = generatedData ? generatedData.questions : [];

    // Save interview session to database
    await run(`
      INSERT INTO interview_sessions (
        id, user_id, candidate_id, candidate_name, job_role, interview_type, difficulty, questions_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId,
      userId,
      candidate.id,
      candidate.full_name,
      job_role.trim(),
      interview_type || 'Technical',
      difficulty || 'All',
      JSON.stringify(questions),
      'Completed'
    ]);

    await addNotification(
      userId,
      'Interview Guide Generated',
      `Tailored interview guide for "${candidate.full_name}" (${job_role}) generated successfully with ${questions.length} questions.`,
      'success'
    );

    res.status(201).json({
      id: sessionId,
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      job_role: job_role.trim(),
      interview_type: interview_type || 'Technical',
      difficulty: difficulty || 'All',
      questions,
      status: 'Completed'
    });
  } catch (err) {
    console.error('Interview generation error:', err);
    res.status(500).json({ error: 'Failed to generate interview: ' + err.message });
  }
};

exports.getInterviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await query(
      'SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const formatted = sessions.map(s => ({
      ...s,
      status: s.status || 'Completed',
      questions: JSON.parse(s.questions_json || '[]')
    }));

    res.json({ interviews: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interviews: ' + err.message });
  }
};

exports.getInterviewById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await get(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found or unauthorized' });
    }

    session.questions = JSON.parse(session.questions_json || '[]');
    session.status = session.status || 'Completed';
    res.json({ interview: session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview: ' + err.message });
  }
};

exports.getInterviewPdf = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await get(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found or unauthorized' });
    }

    // Retrieve candidate background
    const candidate = await get(
      `SELECT id, full_name, email, phone, location, years_of_experience,
              skills_json, education_json, experience_json, projects_json
       FROM candidates WHERE id = ? AND user_id = ?`,
      [session.candidate_id, userId]
    );

    const candidateInfo = {
      full_name: candidate ? candidate.full_name : session.candidate_name,
      email: candidate ? candidate.email : 'Not provided',
      phone: candidate ? candidate.phone : 'Not provided',
      years_of_experience: candidate ? candidate.years_of_experience : 3.0,
      skills: candidate ? JSON.parse(candidate.skills_json || '[]') : [],
      projects: candidate ? JSON.parse(candidate.projects_json || '[]') : [],
      education: candidate ? JSON.parse(candidate.education_json || '[]') : [],
      experience: candidate ? JSON.parse(candidate.experience_json || '[]') : []
    };

    const questions = JSON.parse(session.questions_json || '[]');

    // Request Python AI service to compile clean ReportLab PDF
    const pdfResp = await axios.post(`${AI_URL}/api/ai/generate-pdf`, {
      candidate_info: candidateInfo,
      questions: questions,
      job_role: session.job_role
    }, {
      responseType: 'arraybuffer'
    });

    const filename = `RecruitX_Interview_Guide_${session.candidate_name.replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(pdfResp.data));
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate interview PDF: ' + err.message });
  }
};

exports.updateInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { questions } = req.body;

    const session = await get(
      'SELECT id FROM interview_sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found or unauthorized' });
    }

    await run(
      'UPDATE interview_sessions SET questions_json = ? WHERE id = ?',
      [JSON.stringify(questions || []), id]
    );

    res.json({ message: 'Interview updated successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update interview: ' + err.message });
  }
};

exports.deleteInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await get(
      'SELECT id, candidate_name, pdf_path FROM interview_sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found or unauthorized' });
    }

    // Delete stored PDF file from disk if it exists
    if (session.pdf_path && fs.existsSync(session.pdf_path)) {
      try {
        fs.unlinkSync(session.pdf_path);
      } catch (fileErr) {
        console.warn('Could not delete interview PDF file:', fileErr.message);
      }
    }

    // Delete from SQL database
    await run('DELETE FROM interview_sessions WHERE id = ? AND user_id = ?', [id, userId]);

    await addNotification(
      userId,
      'Interview Guide Deleted',
      `Interview guide for "${session.candidate_name}" was permanently removed. Candidate and resume data remain intact.`,
      'info'
    );

    res.json({
      message: 'Interview guide permanently deleted.',
      deleted_id: id
    });
  } catch (err) {
    console.error('Failed to delete interview:', err);
    res.status(500).json({ error: 'Failed to delete interview: ' + err.message });
  }
};
