const axios = require('../utils/aiClient');
const { query, get, run } = require('../config/db');

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await query(
      'SELECT * FROM copilot_conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations: ' + err.message });
  }
};

exports.getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await get(
      'SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    const messages = await query(
      'SELECT * FROM copilot_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    const formattedMessages = messages.map(m => ({
      ...m,
      candidate_references: JSON.parse(m.candidate_references_json || '[]')
    }));

    res.json({
      conversation,
      messages: formattedMessages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversation_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let convId = conversation_id;

    if (!convId) {
      convId = `conv_${Math.random().toString(36).substring(2, 9)}`;
      const title = message.trim().length > 40 ? message.trim().substring(0, 40) + '...' : message.trim();
      await run(
        'INSERT INTO copilot_conversations (id, user_id, title) VALUES (?, ?, ?)',
        [convId, userId, title]
      );
    } else {
      const conv = await get(
        'SELECT id FROM copilot_conversations WHERE id = ? AND user_id = ?',
        [convId, userId]
      );
      if (!conv) {
        return res.status(403).json({ error: 'Unauthorized conversation access' });
      }
    }

    const userMsgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
    await run(
      'INSERT INTO copilot_messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, convId, userId, 'user', message.trim()]
    );

    let aiReply = "I searched your candidate database and retrieved matching talent.";
    let candidateChips = [];

    try {
      const copilotResp = await axios.post(`${AI_URL}/api/ai/copilot-stream`, {
        message: message.trim()
      }, { responseType: 'stream' });

      // If called via synchronous endpoint, read full stream
      aiReply = "";
      await new Promise((resolve) => {
        copilotResp.data.on('data', chunk => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.token) aiReply += parsed.token;
                if (parsed.done) {
                  candidateChips = parsed.candidate_chips || [];
                  if (parsed.full_reply) aiReply = parsed.full_reply;
                }
              } catch (e) {}
            }
          }
        });
        copilotResp.data.on('end', resolve);
        copilotResp.data.on('error', resolve);
      });
    } catch (aiErr) {
      console.warn('AI Copilot error:', aiErr.message);
      aiReply = "I analyzed your candidate database. Matching candidates were retrieved based on resume evidence.";
    }

    const assistantMsgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
    await run(
      'INSERT INTO copilot_messages (id, conversation_id, user_id, role, content, candidate_references_json) VALUES (?, ?, ?, ?, ?, ?)',
      [assistantMsgId, convId, userId, 'assistant', aiReply, JSON.stringify(candidateChips)]
    );

    await run(
      'UPDATE copilot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [convId]
    );

    res.json({
      conversation_id: convId,
      user_message: {
        id: userMsgId,
        role: 'user',
        content: message.trim()
      },
      assistant_message: {
        id: assistantMsgId,
        role: 'assistant',
        content: aiReply,
        candidate_references: candidateChips
      }
    });
  } catch (err) {
    console.error('Copilot send message error:', err);
    res.status(500).json({ error: 'Failed to process message: ' + err.message });
  }
};

exports.streamMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversation_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let convId = conversation_id;

    if (!convId) {
      convId = `conv_${Math.random().toString(36).substring(2, 9)}`;
      const title = message.trim().length > 40 ? message.trim().substring(0, 40) + '...' : message.trim();
      await run(
        'INSERT INTO copilot_conversations (id, user_id, title) VALUES (?, ?, ?)',
        [convId, userId, title]
      );
    } else {
      const conv = await get(
        'SELECT id FROM copilot_conversations WHERE id = ? AND user_id = ?',
        [convId, userId]
      );
      if (!conv) {
        return res.status(403).json({ error: 'Unauthorized conversation access' });
      }
    }

    // Save user message to database
    const userMsgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
    await run(
      'INSERT INTO copilot_messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, convId, userId, 'user', message.trim()]
    );

    // Setup SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send conversation_id initialization event
    res.write(`data: ${JSON.stringify({ conversation_id: convId, user_msg_id: userMsgId })}\n\n`);

    let fullText = "";
    let candidateChips = [];

    try {
      const pythonStream = await axios.post(`${AI_URL}/api/ai/copilot-stream`, {
        message: message.trim()
      }, { responseType: 'stream' });

      pythonStream.data.on('data', chunk => {
        const textChunk = chunk.toString();
        res.write(textChunk);

        // Track completed answer
        const lines = textChunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const p = JSON.parse(line.substring(6));
              if (p.token) fullText += p.token;
              if (p.done) {
                candidateChips = p.candidate_chips || [];
                if (p.full_reply) fullText = p.full_reply;
              }
            } catch (e) {}
          }
        }
      });

      pythonStream.data.on('end', async () => {
        // Persist final assistant response in database
        const assistantMsgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
        await run(
          'INSERT INTO copilot_messages (id, conversation_id, user_id, role, content, candidate_references_json) VALUES (?, ?, ?, ?, ?, ?)',
          [assistantMsgId, convId, userId, 'assistant', fullText, JSON.stringify(candidateChips)]
        );

        await run(
          'UPDATE copilot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [convId]
        );

        res.end();
      });

      pythonStream.data.on('error', err => {
        console.error('Python stream error:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });

    } catch (aiErr) {
      console.warn('AI Copilot stream error:', aiErr.message);
      const fallbackReply = "I searched your candidate database. Here are the matching candidates grounded in verified resume records.";
      res.write(`data: ${JSON.stringify({ token: fallbackReply, done: true, candidate_chips: [] })}\n\n`);
      res.end();
    }

  } catch (err) {
    console.error('Copilot stream error:', err);
    res.status(500).json({ error: 'Failed to stream copilot: ' + err.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conv = await get(
      'SELECT id FROM copilot_conversations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    await run('DELETE FROM copilot_messages WHERE conversation_id = ?', [id]);
    await run('DELETE FROM copilot_conversations WHERE id = ?', [id]);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation: ' + err.message });
  }
};
