import React, { useState, useEffect } from 'react';
import './Scout.css';

const Scout = () => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch all threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/threads`);
        const data = await response.json();
        setThreads(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching threads:', error);
        setLoading(false);
      }
    };

    fetchThreads();
    // Poll for new threads every 5 seconds
    const interval = setInterval(fetchThreads, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when a thread is selected
  useEffect(() => {
    if (selectedThread) {
      const fetchMessages = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/threads/${selectedThread._id}/messages`);
          const data = await response.json();
          setMessages(data);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };

      fetchMessages();
      // Poll for new messages every 3 seconds when thread is selected
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedThread]);

  const formatPhoneNumber = (phone) => {
    // Simple formatting - you can enhance this
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="scout-container">
        <div className="scout-loading">Loading threads...</div>
      </div>
    );
  }

  return (
    <div className="scout-container">
      <div className="scout-threads-panel">
        <div className="scout-header">
          <h2>Text Threads</h2>
        </div>
        <div className="threads-list">
          {threads.length === 0 ? (
            <div className="no-threads">No text threads yet</div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread._id}
                className={`thread-item ${selectedThread?._id === thread._id ? 'active' : ''}`}
                onClick={() => setSelectedThread(thread)}
              >
                <div className="thread-phone">{formatPhoneNumber(thread.phoneNumber)}</div>
                <div className="thread-preview">
                  <span className="thread-last-message">{thread.lastMessage}</span>
                  <span className="thread-time">{formatTime(thread.lastMessageTime)}</span>
                </div>
                {thread.unreadCount > 0 && (
                  <div className="thread-unread">{thread.unreadCount}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="scout-messages-panel">
        {selectedThread ? (
          <>
            <div className="messages-header">
              <h3>{formatPhoneNumber(selectedThread.phoneNumber)}</h3>
            </div>
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="no-messages">No messages yet</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`message-item ${message.direction === 'inbound' ? 'inbound' : 'outbound'}`}
                  >
                    <div className="message-body">{message.body}</div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="no-thread-selected">
            <p>Select a thread to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scout;

