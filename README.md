# AI-Powered Troubleshooting System

A comprehensive troubleshooting system that integrates your organization's Confluence documentation, Jira tickets, and OpenAI for intelligent recommendations. Built with React, Node.js, and modern web technologies.

## 🚀 Features

### Core Functionality
- **AI-Powered Chat Interface**: Natural language troubleshooting with OpenAI GPT-4
- **Confluence Integration**: Search and reference your organization's documentation
- **Jira Integration**: Find related tickets and issues
- **Vector Database (pgvector)**: Semantic search over your docs/tickets for Retrieval-Augmented Generation (RAG)
- **Session Management**: Create, manage, and export chat sessions
- **History Tracking**: View past conversations and recommendations
- **Analytics Dashboard**: Insights into usage patterns and system performance

### Technical Features
- **RAG Pipeline**: Embeds Confluence/Jira content -> stores in pgvector -> retrieves for GPT context
- **Confidence Scoring**: AI confidence levels for recommendations
- **Caching System**: Efficient caching of Confluence and Jira data
- **Export Functionality**: Export chat sessions as JSON
- **Responsive Design**: Works on desktop and mobile devices
- **Authentication**: Secure user registration and login system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌───────────────────────────┐
│   React Client  │    │  Node.js Server │    │       External APIs       │
│                 │    │                 │    │                           │
│ • Chat UI       │◄──►│ • Express API   │◄──►│ • OpenAI API (GPT + Embd) │
│ • History       │    │ • SQLite (state)│    │ • Confluence              │
│ • Analytics     │    │ • pgvector (RAG)│    │ • Jira                    │
│ • Authentication│    │ • JWT Auth      │    │                           │
└─────────────────┘    └─────────────────┘    └───────────────────────────┘
```

## 📋 Prerequisites

- Node.js 16+ and npm
- OpenAI API key
- (Optional) Confluence API access
- (Optional) Jira API access

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd troubleshooting-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Required
   OPENAI_API_KEY=your-openai-api-key
   JWT_SECRET=your-secret-key
   EMBEDDING_MODEL=text-embedding-3-small

   # pgvector
   VECTOR_DB_HOST=localhost
   VECTOR_DB_PORT=5432
   VECTOR_DB_USER=postgres
   VECTOR_DB_PASSWORD=postgres
   VECTOR_DB_NAME=vectors
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend client on http://localhost:3000

## 🧠 Vector Database (pgvector)

This project includes a pgvector-backed Postgres database for semantic retrieval.

### Start pgvector with Docker Compose
```bash
docker-compose up -d vectordb
```

The app service already depends on `vectordb` when using `docker-compose up -d`.

### What gets indexed?
- Confluence search results and page content
- Jira search results and issue details

Indexing happens automatically (best-effort) whenever data is fetched or found in cache.

### How retrieval works
- When you ask a question, we embed the query
- We run similarity search in `documents` table (cosine distance)
- Top matches are injected into the GPT system prompt alongside live Confluence/Jira context

### Table schema
- `documents(id, source, source_id, title, url, content, metadata, embedding VECTOR, updated_at)`
- Index: `ivfflat` over `embedding` (cosine)

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Chat
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/sessions` - Create new session
- `GET /api/chat/sessions/:id/messages` - Get session messages
- `POST /api/chat/sessions/:id/messages` - Send message
- `DELETE /api/chat/sessions/:id` - Delete session

### History & Analytics
- `GET /api/history/chat` - Chat history
- `GET /api/history/recommendations` - Solution recommendations
- `GET /api/history/analytics` - User analytics
- `GET /api/history/export/:id` - Export session

### External Integrations
- `GET /api/confluence/search` - Search Confluence
- `GET /api/confluence/pages/:id` - Get page content
- `GET /api/jira/search` - Search Jira
- `GET /api/jira/issues/:key` - Get issue details

## 🚀 Deployment

### Production Setup
1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Configure production environment**
   ```bash
   NODE_ENV=production
   PORT=3000
   ```

3. **Start the server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker (App + Vector DB)
```bash
docker-compose up -d
```
- App: http://localhost:3000
- Vector DB: localhost:5432

### Production Notes
- Consider moving stateful data from SQLite to Postgres
- Set stronger secrets and restrict DB access
- Tune pgvector index with appropriate `lists`/`probes` for your dataset size

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests
- **Input Validation** and sanitization
- **Helmet.js** for security headers

## 🧪 Testing

```bash
# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test
```

## 📊 Monitoring

The system includes built-in monitoring:
- Request logging with Morgan
- Error tracking and reporting
- Performance metrics
- User analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Open an issue on GitHub

## 🔄 Updates

To update the system:
1. Pull the latest changes
2. Run `npm run install-all`
3. Restart the servers

---

**Built with ❤️ using React, Node.js, OpenAI, and pgvector**
