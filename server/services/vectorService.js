const { Pool } = require('pg');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pool = new Pool({
  host: process.env.VECTOR_DB_HOST || 'localhost',
  port: parseInt(process.env.VECTOR_DB_PORT || '5432'),
  user: process.env.VECTOR_DB_USER || 'postgres',
  password: process.env.VECTOR_DB_PASSWORD || 'postgres',
  database: process.env.VECTOR_DB_NAME || 'vectors',
  max: 5,
  idleTimeoutMillis: 30000
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMS = EMBEDDING_MODEL.includes('small') ? 1536 : 3072;

const initVectorDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,              -- 'confluence' | 'jira'
        source_id TEXT NOT NULL,           -- page_id or issue_key
        title TEXT,
        url TEXT,
        content TEXT NOT NULL,
        metadata JSONB,
        embedding VECTOR(${EMBEDDING_DIMS}),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source, source_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops)');
  } finally {
    client.release();
  }
};

const embedText = async (text) => {
  const input = text.length > 8000 ? text.slice(0, 8000) : text;
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input });
  return res.data[0].embedding;
};

const upsertDocument = async ({ source, source_id, title, url, content, metadata }) => {
  try {
    await initVectorDb();
    const embedding = await embedText(`${title || ''}\n${content}`);
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO documents (source, source_id, title, url, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (source, source_id)
         DO UPDATE SET title = EXCLUDED.title,
                       url = EXCLUDED.url,
                       content = EXCLUDED.content,
                       metadata = EXCLUDED.metadata,
                       embedding = EXCLUDED.embedding,
                       updated_at = NOW()`,
        [source, source_id, title || null, url || null, content, metadata ? JSON.stringify(metadata) : null, embedding]
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Vector upsert error:', err.message);
  }
};

const similaritySearch = async ({ query, topK = 5, filter = {} }) => {
  await initVectorDb();
  const queryEmbedding = await embedText(query);
  const client = await pool.connect();
  try {
    // Simple optional source filter
    const filterSource = filter.source ? filter.source : null;
    const res = await client.query(
      `SELECT source, source_id, title, url, content, metadata, 1 - (embedding <=> $1) AS score
       FROM documents
       WHERE ($2::text IS NULL OR source = $2)
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [queryEmbedding, filterSource, topK]
    );
    return res.rows;
  } finally {
    client.release();
  }
};

module.exports = {
  initVectorDb,
  upsertDocument,
  similaritySearch,
};