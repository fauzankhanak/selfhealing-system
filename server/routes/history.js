const express = require('express');
const { authenticateToken } = require('./auth');
const { getDatabase } = require('../database/init');

const router = express.Router();
const db = getDatabase();

// Get user's chat history
router.get('/chat', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { limit = 50, offset = 0 } = req.query;
  
  db.all(
    `SELECT cs.id as session_id, cs.title, cs.created_at, cs.updated_at,
            COUNT(cm.id) as message_count
     FROM chat_sessions cs
     LEFT JOIN chat_messages cm ON cs.id = cm.session_id
     WHERE cs.user_id = ?
     GROUP BY cs.id
     ORDER BY cs.updated_at DESC
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)],
    (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch chat history' });
      }
      
      res.json({ sessions });
    }
  );
});

// Get solution recommendations
router.get('/recommendations', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { limit = 20, offset = 0 } = req.query;
  
  db.all(
    `SELECT sr.*, cm.content as user_query, cs.title as session_title
     FROM solution_recommendations sr
     JOIN chat_messages cm ON sr.message_id = cm.id
     JOIN chat_sessions cs ON cm.session_id = cs.id
     WHERE cs.user_id = ?
     ORDER BY sr.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)],
    (err, recommendations) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch recommendations' });
      }
      
      // Parse JSON fields
      const parsedRecommendations = recommendations.map(rec => ({
        ...rec,
        confluence_pages: JSON.parse(rec.confluence_pages || '[]'),
        jira_issues: JSON.parse(rec.jira_issues || '[]')
      }));
      
      res.json({ recommendations: parsedRecommendations });
    }
  );
});

// Get analytics for user
router.get('/analytics', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  // Get session count
  db.get(
    'SELECT COUNT(*) as session_count FROM chat_sessions WHERE user_id = ?',
    [userId],
    (err, sessionCount) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch analytics' });
      }
      
      // Get message count
      db.get(
        `SELECT COUNT(*) as message_count 
         FROM chat_messages cm
         JOIN chat_sessions cs ON cm.session_id = cs.id
         WHERE cs.user_id = ?`,
        [userId],
        (err, messageCount) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch analytics' });
          }
          
          // Get average confidence score
          db.get(
            `SELECT AVG(sr.confidence_score) as avg_confidence
             FROM solution_recommendations sr
             JOIN chat_messages cm ON sr.message_id = cm.id
             JOIN chat_sessions cs ON cm.session_id = cs.id
             WHERE cs.user_id = ?`,
            [userId],
            (err, confidenceData) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch analytics' });
              }
              
              // Get most common issues (based on message content)
              db.all(
                `SELECT cm.content, COUNT(*) as frequency
                 FROM chat_messages cm
                 JOIN chat_sessions cs ON cm.session_id = cs.id
                 WHERE cs.user_id = ? AND cm.role = 'user'
                 GROUP BY LOWER(cm.content)
                 ORDER BY frequency DESC
                 LIMIT 5`,
                [userId],
                (err, commonIssues) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to fetch analytics' });
                  }
                  
                  res.json({
                    analytics: {
                      session_count: sessionCount.session_count,
                      message_count: messageCount.message_count,
                      avg_confidence: confidenceData.avg_confidence || 0,
                      common_issues: commonIssues
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Export chat history
router.get('/export/:sessionId', authenticateToken, (req, res) => {
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
      
      // Get session details and messages
      db.get(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId],
        (err, sessionData) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch session' });
          }
          
          db.all(
            'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
            [sessionId],
            (err, messages) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch messages' });
              }
              
              const exportData = {
                session: sessionData,
                messages: messages.map(msg => ({
                  ...msg,
                  metadata: msg.metadata ? JSON.parse(msg.metadata) : null
                }))
              };
              
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Content-Disposition', `attachment; filename="chat-session-${sessionId}.json"`);
              res.json(exportData);
            }
          );
        }
      );
    }
  );
});

module.exports = router;