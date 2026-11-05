const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/generate', interviewController.generateInterview);
router.get('/', interviewController.getInterviews);
router.get('/:id', interviewController.getInterviewById);
router.get('/:id/pdf', interviewController.getInterviewPdf);
router.put('/:id', interviewController.updateInterview);
router.delete('/:id', interviewController.deleteInterview);

module.exports = router;
