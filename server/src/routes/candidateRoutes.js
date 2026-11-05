const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', candidateController.getCandidates);
router.get('/shortlist', candidateController.getShortlist);
router.post('/search', candidateController.searchCandidates);
router.post('/compare', candidateController.compareCandidates);
router.get('/:id', candidateController.getCandidateById);
router.get('/:id/talent-dna', candidateController.getTalentDNA);
router.post('/:id/shortlist', candidateController.toggleShortlist);

module.exports = router;
