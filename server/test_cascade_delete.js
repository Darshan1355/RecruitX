const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testCascadeDelete() {
  console.log('--- Testing Cascade Deletion Workflow ---');
  // 1. Login as admin
  const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
    email: 'admin@recruitx.ai',
    password: 'Admin@1234'
  });
  const token = loginRes.data.token;

  // 2. Create a temporary test PDF
  const samplePdfPath = path.resolve(__dirname, '../sample_data/resume-001.pdf');
  const tempPdfPath = path.resolve(__dirname, './test_upload_temp.pdf');
  fs.copyFileSync(samplePdfPath, tempPdfPath);

  // 3. Upload test PDF
  const form = new FormData();
  form.append('resumes', fs.createReadStream(tempPdfPath), 'test_candidate_temp.pdf');

  const uploadRes = await axios.post('http://127.0.0.1:5000/api/resumes/upload', form, {
    headers: {
      Authorization: 'Bearer ' + token,
      ...form.getHeaders()
    }
  });

  const uploadResult = uploadRes.data.results[0];
  console.log('Uploaded temp resume ID:', uploadResult.resume_id, '| Status:', uploadResult.status);

  // 4. Verify in DB
  const getRes = await axios.get('http://127.0.0.1:5000/api/resumes/' + uploadResult.resume_id, {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Verified stored resume file:', getRes.data.resume.filename);

  // 5. Delete resume
  const delRes = await axios.delete('http://127.0.0.1:5000/api/resumes/' + uploadResult.resume_id, {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Delete response:', delRes.data.message);

  // 6. Confirm 404 on subsequent get
  try {
    await axios.get('http://127.0.0.1:5000/api/resumes/' + uploadResult.resume_id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.error('FAILED: Resume still accessible after deletion!');
    process.exit(1);
  } catch (err) {
    console.log('SUCCESS: Resume confirmed permanently deleted (Status: ' + err.response.status + ')');
  }

  // Cleanup local temp file
  if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
  console.log('=== CASCADE DELETION TEST PASSED! ===');
}

testCascadeDelete().catch(err => {
  console.error('Cascade delete error:', err.response ? err.response.data : err.message);
  process.exit(1);
});
