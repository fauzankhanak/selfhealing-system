import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Clock, MessageSquare, TrendingUp, BookOpen, Ticket } from 'lucide-react';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, recommendationsRes] = await Promise.all([
        axios.get('/api/history/chat'),
        axios.get('/api/history/recommendations')
      ]);
      
      setSessions(sessionsRes.data.sessions);
      setRecommendations(recommendationsRes.data.recommendations);
    } catch (error) {
      toast.error('Failed to fetch history data');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">History & Analytics</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <MessageSquare size={16} className="mr-2" />
              Chat Sessions ({sessions.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recommendations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <TrendingUp size={16} className="mr-2" />
              Solution Recommendations ({recommendations.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No chat sessions</h3>
              <p className="mt-1 text-sm text-gray-500">Start a conversation to see your chat history here.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.session_id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{session.title}</h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <Clock size={14} className="mr-1" />
                      Created: {format(new Date(session.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <MessageSquare size={14} className="mr-1" />
                      {session.message_count} messages
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Last updated
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(session.updated_at), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start troubleshooting to see AI-powered recommendations here.</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="card hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{rec.session_title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rec.user_query}</p>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(rec.confidence_score)}`}>
                        {getConfidenceText(rec.confidence_score)} Confidence
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">AI Recommendation:</h4>
                    <p className="text-sm text-gray-700">{rec.ai_recommendation}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      {rec.confluence_pages.length > 0 && (
                        <div className="flex items-center">
                          <BookOpen size={14} className="mr-1" />
                          {rec.confluence_pages.length} docs
                        </div>
                      )}
                      {rec.jira_issues.length > 0 && (
                        <div className="flex items-center">
                          <Ticket size={14} className="mr-1" />
                          {rec.jira_issues.length} issues
                        </div>
                      )}
                    </div>
                    <div>
                      {format(new Date(rec.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default History;