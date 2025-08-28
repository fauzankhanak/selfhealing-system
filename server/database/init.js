const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'troubleshooting.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  console.log('🗄️ Initializing database...');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create chat_sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);
  
  // Create chat_messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      metadata TEXT, -- JSON string for additional data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
    )
  `);
  
  // Create confluence_cache table
  db.run(`
    CREATE TABLE IF NOT EXISTS confluence_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT NOT NULL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create jira_cache table
  db.run(`
    CREATE TABLE IF NOT EXISTS jira_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_key TEXT UNIQUE NOT NULL,
      summary TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT,
      assignee TEXT,
      reporter TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create solution_recommendations table
  db.run(`
    CREATE TABLE IF NOT EXISTS solution_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER,
      confluence_pages TEXT, -- JSON array of page IDs
      jira_issues TEXT, -- JSON array of issue keys
      ai_recommendation TEXT NOT NULL,
      confidence_score REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE
    )
  `);
  
  console.log('✅ Database initialized successfully');
};

const getDatabase = () => db;

module.exports = {
  initDatabase,
  getDatabase
};