const axios = require('axios');
const { getDatabase } = require('../database/init');
const { upsertDocument } = require('./vectorService');

const db = getDatabase();

// Jira API configuration
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_USERNAME = process.env.JIRA_USERNAME;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const jiraApi = axios.create({
  baseURL: JIRA_BASE_URL,
  auth: { username: JIRA_USERNAME, password: JIRA_API_TOKEN },
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
});

const searchJira = async (query) => {
  try {
    const cachedResults = await searchCache(query);
    if (cachedResults.length > 0) {
      console.log(`🎫 Found ${cachedResults.length} cached Jira results`);
      cachedResults.forEach(r => upsertDocument({
        source: 'jira',
        source_id: r.issue_key,
        title: r.summary,
        url: `${JIRA_BASE_URL ? JIRA_BASE_URL + '/browse/' + r.issue_key : ''}`,
        content: `${r.summary}. ${r.description || ''}`,
        metadata: { issue_key: r.issue_key, status: r.status }
      }));
      return cachedResults;
    }

    if (!JIRA_BASE_URL || !JIRA_USERNAME || !JIRA_API_TOKEN) {
      console.log('⚠️ Jira credentials not configured, using mock data');
      const mock = getMockJiraData(query);
      mock.forEach(r => upsertDocument({ source: 'jira', source_id: r.issue_key, title: r.summary, url: '', content: `${r.summary}. ${r.description || ''}`, metadata: { issue_key: r.issue_key, status: r.status, mock: true } }));
      return mock;
    }

    const jql = `text ~ "${query}" AND status != Closed ORDER BY updated DESC`;
    const searchResponse = await jiraApi.get('/rest/api/3/search', { params: { jql, maxResults: 10, fields: 'summary,description,status,priority,assignee,reporter,updated' } });

    const results = searchResponse.data.issues.map(issue => ({
      issue_key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description || '',
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      updated_at: issue.fields.updated
    }));

    await cacheResults(results);

    results.forEach(r => upsertDocument({
      source: 'jira',
      source_id: r.issue_key,
      title: r.summary,
      url: `${JIRA_BASE_URL}/browse/${r.issue_key}`,
      content: `${r.summary}. ${r.description || ''}`,
      metadata: { issue_key: r.issue_key, status: r.status }
    }));

    console.log(`🔍 Found ${results.length} Jira results for query: "${query}"`);
    return results;

  } catch (error) {
    console.error('Jira search error:', error.message);
    const mock = getMockJiraData(query);
    mock.forEach(r => upsertDocument({ source: 'jira', source_id: r.issue_key, title: r.summary, url: '', content: `${r.summary}. ${r.description || ''}`, metadata: { issue_key: r.issue_key, status: r.status, mock: true } }));
    return mock;
  }
};

const searchCache = (query) => {
  return new Promise((resolve, reject) => {
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const like = `%${keywords.join('%')}%`;
    db.all(
      `SELECT * FROM jira_cache 
       WHERE summary LIKE ? OR description LIKE ? 
       ORDER BY updated_at DESC 
       LIMIT 5`,
      [like, like],
      (err, rows) => { if (err) reject(err); else resolve(rows || []); }
    );
  });
};

const cacheResults = (results) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO jira_cache (issue_key, summary, description, status, priority, assignee, reporter, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    results.forEach(result => {
      stmt.run([
        result.issue_key,
        result.summary,
        result.description,
        result.status,
        result.priority,
        result.assignee,
        result.reporter,
        result.updated_at || new Date().toISOString()
      ]);
    });
    stmt.finalize(err => err ? reject(err) : resolve());
  });
};

const getMockJiraData = (query) => {
  const mockData = [
    { issue_key: 'IT-1234', summary: 'Network connectivity issues in Building A', description: 'Users in Building A are experiencing intermittent network connectivity issues. Symptoms include slow internet speeds and occasional disconnections.', status: 'In Progress', priority: 'High', assignee: 'John Smith', reporter: 'Jane Doe', updated_at: new Date().toISOString() },
    { issue_key: 'IT-1235', summary: 'VPN connection timeout errors', description: 'Multiple users reporting VPN connection timeout errors when trying to connect from remote locations.', status: 'Open', priority: 'Medium', assignee: 'Mike Johnson', reporter: 'Sarah Wilson', updated_at: new Date().toISOString() },
    { issue_key: 'IT-1236', summary: 'Email client configuration problems', description: 'New employees having trouble configuring their email clients with the correct IMAP/SMTP settings.', status: 'Resolved', priority: 'Low', assignee: 'Lisa Brown', reporter: 'HR Department', updated_at: new Date().toISOString() },
    { issue_key: 'IT-1237', summary: 'Printer driver installation issues', description: 'Windows 11 users unable to install printer drivers for HP LaserJet printers.', status: 'In Progress', priority: 'Medium', assignee: 'David Lee', reporter: 'Marketing Team', updated_at: new Date().toISOString() }
  ];
  const keywords = query.toLowerCase().split(' ');
  return mockData.filter(item => keywords.some(k => item.summary.toLowerCase().includes(k) || item.description.toLowerCase().includes(k) || item.status.toLowerCase().includes(k)));
};

const getIssueDetails = async (issueKey) => {
  try {
    const cached = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM jira_cache WHERE issue_key = ?', [issueKey], (err, row) => err ? reject(err) : resolve(row));
    });
    if (cached) return cached;

    if (!JIRA_BASE_URL || !JIRA_USERNAME || !JIRA_API_TOKEN) {
      throw new Error('Jira credentials not configured');
    }

    const response = await jiraApi.get(`/rest/api/3/issue/${issueKey}`, { params: { fields: 'summary,description,status,priority,assignee,reporter,updated,comment' } });
    const issue = response.data;
    const result = {
      issue_key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description || '',
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      updated_at: issue.fields.updated
    };

    await cacheResults([result]);
    upsertDocument({ source: 'jira', source_id: result.issue_key, title: result.summary, url: `${JIRA_BASE_URL}/browse/${result.issue_key}`, content: `${result.summary}. ${result.description || ''}`, metadata: { issue_key: result.issue_key, status: result.status } });

    return result;

  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    throw error;
  }
};

const createJiraIssue = async (issueData) => {
  try {
    if (!JIRA_BASE_URL || !JIRA_USERNAME || !JIRA_API_TOKEN) {
      throw new Error('Jira credentials not configured');
    }

    const payload = {
      fields: {
        project: { key: issueData.projectKey || 'IT' },
        summary: issueData.summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: issueData.description }] }] },
        issuetype: { name: issueData.issueType || 'Bug' },
        priority: { name: issueData.priority || 'Medium' }
      }
    };

    const response = await jiraApi.post('/rest/api/3/issue', payload);
    console.log(`✅ Created Jira issue: ${response.data.key}`);
    return response.data;

  } catch (error) {
    console.error('Error creating Jira issue:', error.message);
    throw error;
  }
};

module.exports = { searchJira, getIssueDetails, createJiraIssue };