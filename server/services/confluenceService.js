const axios = require('axios');
const { getDatabase } = require('../database/init');
const { upsertDocument } = require('./vectorService');

const db = getDatabase();

// Confluence API configuration
const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_USERNAME = process.env.CONFLUENCE_USERNAME;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;

const confluenceApi = axios.create({
  baseURL: CONFLUENCE_BASE_URL,
  auth: {
    username: CONFLUENCE_USERNAME,
    password: CONFLUENCE_API_TOKEN
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

const searchConfluence = async (query) => {
  try {
    const cachedResults = await searchCache(query);
    if (cachedResults.length > 0) {
      console.log(`📚 Found ${cachedResults.length} cached Confluence results`);
      // Fire-and-forget index to vector store
      cachedResults.forEach(r => upsertDocument({
        source: 'confluence',
        source_id: r.page_id,
        title: r.title,
        url: r.url,
        content: r.content,
        metadata: { page_id: r.page_id }
      }));
      return cachedResults;
    }

    if (!CONFLUENCE_BASE_URL || !CONFLUENCE_USERNAME || !CONFLUENCE_API_TOKEN) {
      console.log('⚠️ Confluence credentials not configured, using mock data');
      const mock = getMockConfluenceData(query);
      mock.forEach(r => upsertDocument({ source: 'confluence', source_id: r.page_id, title: r.title, url: r.url, content: r.content, metadata: { page_id: r.page_id, mock: true } }));
      return mock;
    }

    const searchResponse = await confluenceApi.get('/rest/api/content/search', {
      params: { cql: `text ~ "${query}" AND type = page`, limit: 10, expand: 'body.storage' }
    });

    const results = searchResponse.data.results.map(page => ({
      page_id: page.id,
      title: page.title,
      content: page.body?.storage?.value || '',
      url: `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
      last_updated: page.lastUpdated
    }));

    await cacheResults(results);

    // Index to vector DB (best-effort)
    results.forEach(r => upsertDocument({
      source: 'confluence',
      source_id: r.page_id,
      title: r.title,
      url: r.url,
      content: r.content,
      metadata: { page_id: r.page_id }
    }));

    console.log(`🔍 Found ${results.length} Confluence results for query: "${query}"`);
    return results;

  } catch (error) {
    console.error('Confluence search error:', error.message);
    const mock = getMockConfluenceData(query);
    mock.forEach(r => upsertDocument({ source: 'confluence', source_id: r.page_id, title: r.title, url: r.url, content: r.content, metadata: { page_id: r.page_id, mock: true } }));
    return mock;
  }
};

const searchCache = (query) => {
  return new Promise((resolve, reject) => {
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const like = `%${keywords.join('%')}%`;
    db.all(
      `SELECT * FROM confluence_cache 
       WHERE title LIKE ? OR content LIKE ? 
       ORDER BY last_updated DESC 
       LIMIT 5`,
      [like, like],
      (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      }
    );
  });
};

const cacheResults = (results) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO confluence_cache (page_id, title, content, url, last_updated) VALUES (?, ?, ?, ?, ?)'
    );
    results.forEach(result => {
      stmt.run([
        result.page_id,
        result.title,
        result.content,
        result.url,
        result.last_updated || new Date().toISOString()
      ]);
    });
    stmt.finalize(err => err ? reject(err) : resolve());
  });
};

const getMockConfluenceData = (query) => {
  const mockData = [
    { page_id: '12345', title: 'Network Connectivity Troubleshooting Guide', content: 'This guide covers common network connectivity issues and their solutions. Step 1: Check physical connections. Step 2: Verify IP configuration. Step 3: Test DNS resolution.', url: 'https://confluence.example.com/pages/viewpage.action?pageId=12345', last_updated: new Date().toISOString() },
    { page_id: '12346', title: 'Email Configuration Setup', content: 'Complete guide for setting up email clients and troubleshooting common email issues. Includes IMAP, SMTP, and POP3 configurations.', url: 'https://confluence.example.com/pages/viewpage.action?pageId=12346', last_updated: new Date().toISOString() },
    { page_id: '12347', title: 'VPN Connection Issues', content: 'Troubleshooting guide for VPN connectivity problems. Common issues include certificate errors, authentication failures, and network conflicts.', url: 'https://confluence.example.com/pages/viewpage.action?pageId=12347', last_updated: new Date().toISOString() }
  ];
  const keywords = query.toLowerCase().split(' ');
  return mockData.filter(item => keywords.some(k => item.title.toLowerCase().includes(k) || item.content.toLowerCase().includes(k)));
};

const getPageContent = async (pageId) => {
  try {
    const cached = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM confluence_cache WHERE page_id = ?', [pageId], (err, row) => err ? reject(err) : resolve(row));
    });
    if (cached) return cached;

    if (!CONFLUENCE_BASE_URL || !CONFLUENCE_USERNAME || !CONFLUENCE_API_TOKEN) {
      throw new Error('Confluence credentials not configured');
    }

    const response = await confluenceApi.get(`/rest/api/content/${pageId}`, { params: { expand: 'body.storage' } });
    const page = response.data;
    const result = {
      page_id: page.id,
      title: page.title,
      content: page.body?.storage?.value || '',
      url: `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
      last_updated: page.lastUpdated
    };

    await cacheResults([result]);
    // Index to vector DB
    upsertDocument({ source: 'confluence', source_id: result.page_id, title: result.title, url: result.url, content: result.content, metadata: { page_id: result.page_id } });

    return result;

  } catch (error) {
    console.error('Error fetching page content:', error.message);
    throw error;
  }
};

module.exports = {
  searchConfluence,
  getPageContent
};