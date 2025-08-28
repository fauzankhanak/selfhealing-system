import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, Plus, Trash2, Download, BookOpen, Ticket } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

const Chat = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/chat/sessions');
      setSessions(response.data);
      if (response.data.length > 0 && !currentSession) {
        setCurrentSession(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch chat sessions');
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await axios.get(`/api/chat/sessions/${sessionId}/messages`);
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to fetch messages');
    }
  };

  const createNewSession = async () => {
    if (!newSessionTitle.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    try {
      const response = await axios.post('/api/chat/sessions', {
        title: newSessionTitle,
      });
      
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
      setNewSessionTitle('');
      setShowNewSessionModal(false);
      toast.success('New session created');
    } catch (error) {
      toast.error('Failed to create new session');
    }
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await axios.delete(`/api/chat/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(sessions[0] || null);
        setMessages([]);
      }
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      const response = await axios.post(`/api/chat/sessions/${currentSession.id}/messages`, {
        content: inputMessage,
      });

      const { assistant_message, sources } = response.data;
      
      setMessages(prev => [...prev, {
        ...assistant_message,
        sources,
      }]);

      // Update session list to show the updated session
      fetchSessions();
    } catch (error) {
      toast.error('Failed to send message');
      // Remove the user message if sending failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportSession = async () => {
    if (!currentSession) return;

    try {
      const response = await axios.get(`/api/history/export/${currentSession.id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-session-${currentSession.id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to export session');
    }
  };

  const MessageSources = ({ sources }) => {
    if (!sources || (!sources.confluence?.length && !sources.jira?.length)) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Sources:</h4>
        <div className="space-y-2">
          {sources.confluence?.length > 0 && (
            <div>
              <div className="flex items-center text-xs text-blue-700 mb-1">
                <BookOpen size={12} className="mr-1" />
                Documentation ({sources.confluence.length})
              </div>
              <div className="text-xs text-blue-600">
                {sources.confluence.map((page, index) => (
                  <div key={index} className="truncate">
                    {page.title}
                  </div>
                ))}
              </div>
            </div>
          )}
          {sources.jira?.length > 0 && (
            <div>
              <div className="flex items-center text-xs text-blue-700 mb-1">
                <Ticket size={12} className="mr-1" />
                Related Issues ({sources.jira.length})
              </div>
              <div className="text-xs text-blue-600">
                {sources.jira.map((issue, index) => (
                  <div key={index} className="truncate">
                    {issue.issue_key}: {issue.summary}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex">
      {/* Sessions Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chat Sessions</h2>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                currentSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => setCurrentSession(session)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {session.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {format(new Date(session.updated_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentSession.title}
                </h1>
                <button
                  onClick={exportSession}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <Download size={16} className="mr-1" />
                  Export
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p>Start a conversation by typing your issue below.</p>
                  <p className="text-sm mt-2">
                    Try asking about network issues, email problems, or VPN connectivity.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-3xl ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                      <ReactMarkdown className="markdown-content">
                        {message.content}
                      </ReactMarkdown>
                      {message.sources && <MessageSources sources={message.sources} />}
                      <div className="text-xs opacity-70 mt-2">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="message-assistant">
                    <div className="loading-dots">Thinking</div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your technical issue..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    disabled={sending}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || sending}
                  className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Select a chat session or create a new one to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Session</h3>
            <input
              type="text"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              placeholder="Enter session title..."
              className="input-field mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createNewSession()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createNewSession}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;