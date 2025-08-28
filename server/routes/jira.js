const express = require('express');
const { authenticateToken } = require('./auth');
const { searchJira, getIssueDetails, createJiraIssue } = require('../services/jiraService');

const router = express.Router();

// Search Jira tickets
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await searchJira(query);
    res.json({ results });
    
  } catch (error) {
    console.error('Jira search error:', error);
    res.status(500).json({ error: 'Failed to search Jira' });
  }
});

// Get specific issue details
router.get('/issues/:issueKey', authenticateToken, async (req, res) => {
  try {
    const { issueKey } = req.params;
    const issue = await getIssueDetails(issueKey);
    res.json({ issue });
    
  } catch (error) {
    console.error('Jira issue error:', error);
    res.status(500).json({ error: 'Failed to fetch issue details' });
  }
});

// Create new Jira issue
router.post('/issues', authenticateToken, async (req, res) => {
  try {
    const { summary, description, projectKey, issueType, priority } = req.body;
    
    if (!summary || !description) {
      return res.status(400).json({ error: 'Summary and description are required' });
    }
    
    const issueData = {
      summary,
      description,
      projectKey: projectKey || 'IT',
      issueType: issueType || 'Bug',
      priority: priority || 'Medium'
    };
    
    const newIssue = await createJiraIssue(issueData);
    res.status(201).json({ issue: newIssue });
    
  } catch (error) {
    console.error('Jira create issue error:', error);
    res.status(500).json({ error: 'Failed to create Jira issue' });
  }
});

module.exports = router;