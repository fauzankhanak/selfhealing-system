# AI-Powered Troubleshooting System

A comprehensive troubleshooting system that integrates your organization's Confluence documentation, Jira tickets, and OpenAI for intelligent recommendations. Built with React, Node.js, and modern web technologies.

## 🚀 Features

### Core Functionality
- **AI-Powered Chat Interface**: Natural language troubleshooting with OpenAI GPT-4
- **Confluence Integration**: Search and reference your organization's documentation
- **Jira Integration**: Find related tickets and issues
- **Session Management**: Create, manage, and export chat sessions
- **History Tracking**: View past conversations and recommendations
- **Analytics Dashboard**: Insights into usage patterns and system performance

### Technical Features
- **Real-time Chat**: Instant AI responses with source attribution
- **Confidence Scoring**: AI confidence levels for recommendations
- **Caching System**: Efficient caching of Confluence and Jira data
- **Export Functionality**: Export chat sessions as JSON
- **Responsive Design**: Works on desktop and mobile devices
- **Authentication**: Secure user registration and login system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │   External APIs │
│                 │    │                 │    │                 │
│ • Chat UI       │◄──►│ • Express API   │◄──►│ • OpenAI API    │
│ • History       │    │ • SQLite DB     │    │ • Confluence    │
│ • Analytics     │    │ • JWT Auth      │    │ • Jira          │
│ • Authentication│    │ • Rate Limiting │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
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
   
   # Optional - Confluence
   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
   CONFLUENCE_USERNAME=your-email@domain.com
   CONFLUENCE_API_TOKEN=your-api-token
   
   # Optional - Jira
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_USERNAME=your-email@domain.com
   JIRA_API_TOKEN=your-api-token
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend client on http://localhost:3000

## 🔧 Configuration

### OpenAI Setup
1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your `.env` file

### Confluence Setup (Optional)
1. Generate an API token in your Atlassian account
2. Configure the Confluence URL and credentials in `.env`
3. The system will use mock data if not configured

### Jira Setup (Optional)
1. Generate an API token in your Atlassian account
2. Configure the Jira URL and credentials in `.env`
3. The system will use mock data if not configured

## 🎯 Usage

### Getting Started
1. Open http://localhost:3000 in your browser
2. Register a new account or use demo credentials:
   - Username: `demo`
   - Password: `demo123`
3. Create a new chat session
4. Start describing your technical issue

### Example Queries
- "I can't connect to the VPN"
- "My email client won't sync"
- "Network is slow in building A"
- "Printer driver installation failed"

### Features Overview

#### Chat Interface
- **Real-time AI responses** with step-by-step solutions
- **Source attribution** showing relevant documentation and tickets
- **Confidence scoring** indicating AI certainty
- **Session management** for organizing conversations

#### History & Analytics
- **Chat history** with searchable sessions
- **Solution recommendations** with confidence levels
- **Usage analytics** and insights
- **Export functionality** for session data

## 🗄️ Database Schema

The system uses SQLite with the following tables:

- **users**: User accounts and authentication
- **chat_sessions**: Chat conversation sessions
- **chat_messages**: Individual messages in conversations
- **confluence_cache**: Cached Confluence documentation
- **jira_cache**: Cached Jira tickets
- **solution_recommendations**: AI-generated solutions

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

**Built with ❤️ using React, Node.js, and OpenAI**
