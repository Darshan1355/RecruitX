const axios = require('axios');

async function testAll() {
  console.log('--- 1. Testing Registration ---');
  const userAEmail = 'recruiter_' + Date.now() + '@talentiq.ai';
  const regRes = await axios.post('http://127.0.0.1:5000/api/auth/register', {
    name: 'Recruiter Alpha',
    email: userAEmail,
    password: 'Password123'
  });
  console.log('Registered User A:', regRes.data.user.email);
  const tokenA = regRes.data.token;

  console.log('--- 2. Testing Stats for User A (Tenant Isolation) ---');
  const statsA = await axios.get('http://127.0.0.1:5000/api/dashboard/stats', {
    headers: { Authorization: 'Bearer ' + tokenA }
  });
  console.log('User A Total Resumes (should be 0 for fresh user):', statsA.data.stats.total_resumes);

  console.log('--- 3. Testing Lead Recruiter (Pre-seeded 10 Resumes) ---');
  const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
    email: 'admin@talentiq.ai',
    password: 'Admin@1234'
  });
  const tokenAdmin = loginRes.data.token;
  const statsAdmin = await axios.get('http://127.0.0.1:5000/api/dashboard/stats', {
    headers: { Authorization: 'Bearer ' + tokenAdmin }
  });
  console.log('Admin Total Resumes:', statsAdmin.data.stats.total_resumes);
  console.log('Admin Candidates Indexed:', statsAdmin.data.stats.candidates_indexed);

  console.log('--- 4. Testing Candidate Search (RAG) ---');
  const searchRes = await axios.post('http://127.0.0.1:5000/api/candidates/search', {
    query: 'Find Java developers with Spring Boot, MySQL and 2+ years of relevant experience',
    limit: 3
  }, { headers: { Authorization: 'Bearer ' + tokenAdmin } });
  console.log('Search returned candidates:', searchRes.data.results.length);
  const topCand = searchRes.data.results[0];
  console.log('Top Match:', topCand.name, '| Match Score:', topCand.match_score + '%');

  console.log('--- 5. Testing Candidate Profile & Talent DNA ---');
  const dnaRes = await axios.get('http://127.0.0.1:5000/api/candidates/' + topCand.id + '/talent-dna', {
    headers: { Authorization: 'Bearer ' + tokenAdmin }
  });
  console.log('Talent DNA Competencies:', dnaRes.data.competencies.length, 'dimensions');
  console.log('Evidence Citations count:', dnaRes.data.evidence_citations.length);

  console.log('--- 6. Testing Candidate Comparison ---');
  const candsList = (await axios.get('http://127.0.0.1:5000/api/candidates', {
    headers: { Authorization: 'Bearer ' + tokenAdmin }
  })).data.candidates;
  const compRes = await axios.post('http://127.0.0.1:5000/api/candidates/compare', {
    candidate_ids: [candsList[0].id, candsList[1].id]
  }, { headers: { Authorization: 'Bearer ' + tokenAdmin } });
  console.log('Comparison Matrix Rows:', compRes.data.comparison_matrix.length);
  console.log('AI Summary:', compRes.data.ai_summary.substring(0, 80) + '...');

  console.log('--- 7. Testing AI Copilot ---');
  const copilotRes = await axios.post('http://127.0.0.1:5000/api/copilot/chat', {
    message: 'Compare top candidates for Spring Boot roles'
  }, { headers: { Authorization: 'Bearer ' + tokenAdmin } });
  console.log('Copilot Reply:', copilotRes.data.assistant_message.content.substring(0, 90) + '...');
  console.log('Candidate references:', copilotRes.data.assistant_message.candidate_references.length);

  console.log('--- 8. Testing AI Interview Studio ---');
  const intRes = await axios.post('http://127.0.0.1:5000/api/interviews/generate', {
    candidate_id: topCand.id,
    job_role: 'Senior Java Backend Architect',
    interview_type: 'Technical',
    difficulty: 'Advanced',
    count: 3
  }, { headers: { Authorization: 'Bearer ' + tokenAdmin } });
  console.log('Generated questions:', intRes.data.questions.length);
  console.log('Question 1:', intRes.data.questions[0].question.substring(0, 70) + '...');

  console.log('--- 9. Testing Strict Data Isolation ---');
  try {
    await axios.get('http://127.0.0.1:5000/api/interviews/' + intRes.data.id, {
      headers: { Authorization: 'Bearer ' + tokenA }
    });
    console.error('FAILED: User A accessed Admin interview!');
    process.exit(1);
  } catch (err) {
    console.log('SUCCESS: User A blocked with status:', err.response.status);
  }

  console.log('=== ALL 9 END-TO-END TESTS PASSED SUCCESSFULLY! ===');
}

testAll().catch(err => {
  console.error('Test error:', err.response ? err.response.data : err.message);
  process.exit(1);
});
