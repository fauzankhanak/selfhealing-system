# Quick Start Guide

Get the AI-Powered Troubleshooting System running in 5 minutes!

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd troubleshooting-system
./setup.sh
```

### Option 2: Manual Setup
```bash
# Install dependencies
npm run install-all

# Copy environment file
cp .env.example .env
```

## ⚙️ Configuration

Edit `.env` file with your settings:

```env
# Required: Get from https://platform.openai.com/
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Change this in production
JWT_SECRET=your-secret-key
```

## 🎯 Start the Application

```bash
# Start both frontend and backend
npm run dev
```

Open http://localhost:3000 in your browser.

## 👤 First Login

Use these demo credentials:
- **Username**: `demo`
- **Password**: `demo123`

Or register a new account.

## 💬 Try It Out

1. **Create a new chat session**
2. **Ask a question** like:
   - "I can't connect to the VPN"
   - "My email won't sync"
   - "Network is slow"
3. **Get AI-powered solutions** with source references

## 🔧 Optional Integrations

### Confluence Setup
Add to `.env`:
```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@domain.com
CONFLUENCE_API_TOKEN=your-api-token
```

### Jira Setup
Add to `.env`:
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@domain.com
JIRA_API_TOKEN=your-api-token
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# Access at http://localhost:3000
```

## 📊 Features to Explore

- **Chat Interface**: AI-powered troubleshooting
- **History**: View past conversations
- **Analytics**: Usage insights and metrics
- **Export**: Download chat sessions
- **Session Management**: Organize conversations

## 🆘 Need Help?

- Check the full [README.md](README.md)
- Review API endpoints in the documentation
- Open an issue for support

---

**That's it! You're ready to start troubleshooting with AI! 🎉**