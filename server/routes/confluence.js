const express = require('express');
const { authenticateToken } = require('./auth');
const { searchConfluence, getPageContent } = require('../services/confluenceService');

const router = express.Router();

// Search Confluence documentation
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await searchConfluence(query);
    res.json({ results });
    
  } catch (error) {
    console.error('Confluence search error:', error);
    res.status(500).json({ error: 'Failed to search Confluence' });
  }
});

// Get specific page content
router.get('/pages/:pageId', authenticateToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await getPageContent(pageId);
    res.json({ page });
    
  } catch (error) {
    console.error('Confluence page error:', error);
    res.status(500).json({ error: 'Failed to fetch page content' });
  }
});

module.exports = router;