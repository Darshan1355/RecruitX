const express = require('express');
const router = express.Router();
const copilotController = require('../controllers/copilotController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/conversations', copilotController.getConversations);
router.get('/conversations/:id', copilotController.getConversationById);
router.post('/chat', copilotController.sendMessage);
router.post('/chat-stream', copilotController.streamMessage);
router.delete('/conversations/:id', copilotController.deleteConversation);

module.exports = router;
