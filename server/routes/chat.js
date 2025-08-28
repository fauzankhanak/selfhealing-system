const express = require('express');
const { authenticateToken } = require('./auth');
const { getDatabase } = require('../database/init');
const { generateTroubleshootingResponse } = require('../services/aiService');
const { searchConfluence } = require('../services/confluenceService');
const { searchJira } = require('../services/jiraService');

const router = express.Router();
const db = getDatabase();

// Create new chat session
router.post('/sessions', authenticateToken, (req, res) => {
  const { title } = req.body;
  const userId = req.user.userId;
  
  if (!title) {
    return res.status(400).json({ error: 'Session title is required' });
  }
  
  db.run(
    'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
    [userId, title],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.status(201).json({
        id: this.lastID,
        title,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Get user's chat sessions
router.get('/sessions', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.all(
    'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
    (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch sessions' });
      }
      
      res.json(sessions);
    }
  );
});

// Get chat messages for a session
router.get('/sessions/:sessionId/messages', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;
  
  // Verify session belongs to user
  db.get(
    'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Get messages
      db.all(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch messages' });
          }
          
          res.json(messages);
        }
      );
    }
  );
});

// Send message and get AI response
router.post('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;
  const userId = req.user.userId;
  
  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  
  try {
    // Verify session belongs to user
    const session = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId],
        (err, session) => {
          if (err) reject(err);
          else resolve(session);
        }
      );
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Save user message
    const userMessageId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
        [sessionId, 'user', content],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Update session timestamp
    db.run(
      'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );
    
    // Search for relevant documentation and tickets
    const [confluenceResults, jiraResults] = await Promise.all([
      searchConfluence(content),
      searchJira(content)
    ]);
    
    // Generate AI response
    const aiResponse = await generateTroubleshootingResponse(
      content,
      confluenceResults,
      jiraResults
    );
    
    // Save AI response
    const assistantMessageId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_messages (session_id, role, content, metadata) VALUES (?, ?, ?, ?)',
        [
          sessionId,
          'assistant',
          aiResponse.response,
          JSON.stringify({
            confluence_pages: confluenceResults.map(r => r.page_id),
            jira_issues: jiraResults.map(r => r.issue_key),
            confidence_score: aiResponse.confidence
          })
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Save solution recommendation
    if (aiResponse.confidence > 0.3) {
      db.run(
        'INSERT INTO solution_recommendations (message_id, confluence_pages, jira_issues, ai_recommendation, confidence_score) VALUES (?, ?, ?, ?, ?)',
        [
          assistantMessageId,
          JSON.stringify(confluenceResults.map(r => r.page_id)),
          JSON.stringify(jiraResults.map(r => r.issue_key)),
          aiResponse.response,
          aiResponse.confidence
        ]
      );
    }
    
    res.json({
      user_message: {
        id: userMessageId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      },
      assistant_message: {
        id: assistantMessageId,
        role: 'assistant',
        content: aiResponse.response,
        metadata: {
          confluence_pages: confluenceResults.map(r => r.page_id),
          jira_issues: jiraResults.map(r => r.issue_key),
          confidence_score: aiResponse.confidence
        },
        created_at: new Date().toISOString()
      },
      sources: {
        confluence: confluenceResults,
        jira: jiraResults
      }
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;
  
  db.run(
    'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete session' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json({ message: 'Session deleted successfully' });
    }
  );
});

module.exports = router;