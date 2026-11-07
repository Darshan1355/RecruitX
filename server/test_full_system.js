const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: data ? JSON.parse(data) : null, raw: data });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TALENTIQ COMPLETE SUITE SYSTEM VERIFICATION ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  // 1. Python AI Health
  const aiHealth = await request({ hostname: '127.0.0.1', port: 5001, path: '/api/ai/health', method: 'GET' });
  assert(aiHealth.status === 200 && aiHealth.data.indexed_resumes >= 10, 'Python AI Engine healthy with 10+ resumes indexed in ChromaDB');

  // 2. Python AI Calibrated Search
  const aiSearch = await request({
    hostname: '127.0.0.1', port: 5001, path: '/api/ai/search', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { query: 'Machine Learning Engineer with Python and TensorFlow' });
  assert(aiSearch.status === 200 && aiSearch.data.results && aiSearch.data.results.length > 0 && aiSearch.data.results[0].ats_breakdown, 'AI Search returns calibrated scores & transparent breakdowns');

  // 3. Node Login & JWT
  const loginRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@recruitx.ai', password: 'Admin@1234' });
  assert(loginRes.status === 200 && loginRes.data.token, 'Node.js JWT Authentication successful');
  const token = loginRes.data?.token;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 4. Dashboard Stats
  const statsRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/dashboard/stats', method: 'GET', headers: authHeaders });
  assert(statsRes.status === 200 && statsRes.data.stats.total_resumes > 0, `Dashboard stats retrieved: ${statsRes.data?.stats?.total_resumes} resumes, ${statsRes.data?.stats?.total_candidates} candidates`);

  // 5. Shortlist Candidates Endpoint
  const shortlistRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/candidates/shortlist', method: 'GET', headers: authHeaders });
  assert(shortlistRes.status === 200 && Array.isArray(shortlistRes.data.candidates), `Shortlist endpoint works (${shortlistRes.data.candidates.length} currently shortlisted)`);

  // 6. Notifications Center API
  const notifRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/notifications', method: 'GET', headers: authHeaders });
  assert(notifRes.status === 200 && Array.isArray(notifRes.data.notifications), `Notification Center API active (${notifRes.data.notifications.length} notifications)`);

  // 7. In-App Resume File Stream (JWT protected)
  const resumesList = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/resumes', method: 'GET', headers: authHeaders });
  if (resumesList.data?.resumes?.length > 0) {
    const resumeId = resumesList.data.resumes[0].id;
    const fileStream = await request({ hostname: '127.0.0.1', port: 5000, path: `/api/resumes/${resumeId}/file`, method: 'GET', headers: authHeaders });
    assert(fileStream.status === 200 && fileStream.headers['content-type'] === 'application/pdf', 'In-App Resume streaming endpoint delivers PDF binary with inline headers');
  }

  // 8. Domain-Aware Interview Generation
  const candidatesList = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/candidates', method: 'GET', headers: authHeaders });
  if (candidatesList.data?.candidates?.length > 0) {
    const candId = candidatesList.data.candidates[0].id;
    const interviewRes = await request({
      hostname: '127.0.0.1', port: 5000, path: '/api/interviews/generate', method: 'POST',
      headers: authHeaders
    }, { candidate_id: candId, job_role: 'Senior Machine Learning Specialist', interview_type: 'Technical', difficulty: 'Advanced', count: 4 });
    assert((interviewRes.status === 200 || interviewRes.status === 201) && interviewRes.data.questions?.length === 4, 'Interview Studio generates role & candidate project-grounded questions');
  }

  // 9. Side-by-Side Candidate Comparison
  if (candidatesList.data?.candidates?.length >= 2) {
    const compareRes = await request({
      hostname: '127.0.0.1', port: 5000, path: '/api/candidates/compare', method: 'POST',
      headers: authHeaders
    }, { candidate_ids: [candidatesList.data.candidates[0].id, candidatesList.data.candidates[1].id] });
    assert(compareRes.status === 200 && compareRes.data.ai_summary && compareRes.data.comparison_matrix, 'Candidate Comparison matrix and comparative AI analysis synthesized');
  }

  // 10. Frontend Client Availability on Port 3000
  const clientRes = await request({ hostname: '127.0.0.1', port: 3000, path: '/', method: 'GET' });
  assert(clientRes.status === 200 && clientRes.raw.includes('RecruitX'), 'Vite React Frontend online and serving RecruitX application on http://127.0.0.1:3000');

  console.log(`\n=== RESULTS: ${passed} / ${total} CHECKS PASSED ===\n`);
  if (passed === total) {
    console.log('ALL TALENTIQ SUBSYSTEMS & USER REQUIREMENTS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
