import React, { useState, useEffect } from 'react';
import MessageList, { Message } from './MessageList';
import InputBox from './InputBox';
import { scrapePageContext, getContextSummary, PageContext } from '../utils/contextScraper';
import { v4 as uuidv4 } from 'uuid';

// Use HTTP for local development with backend
const API_URL = 'http://localhost:4000/api/chat';
const SEARCH_API_URL = 'http://localhost:4000/api/chat/search';
// For production, replace with your deployed backend URL
// const API_URL = 'https://yourdomain.com/api/chat';
// const SEARCH_API_URL = 'https://yourdomain.com/api/chat/search';

const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [conversationId] = useState(() => uuidv4());
  const [clarificationOptions, setClarificationOptions] = useState<string[] | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<{ answer: string; source: string }[] | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name?: string; county?: string; email?: string }>({});
  const [showProfile, setShowProfile] = useState(false);
  const [handoff, setHandoff] = useState<{ required: boolean; method?: string } | null>(null);
  const [messagesHeight, setMessagesHeight] = useState(320); // default height for messages/docs area
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    // Scrape page context when component mounts
    const context = scrapePageContext();
    setPageContext(context);
    
    // Auto-greet after a short delay
    const timer = setTimeout(() => {
      if (!hasGreeted) {
        handleGreeting();
        setHasGreeted(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [hasGreeted]);

  const handleGreeting = async () => {
    setLoading(true);
    try {
      const requestBody = {
        message: '',
        context: pageContext ? getContextSummary(pageContext) : null,
        pageUrl: pageContext?.url || window.location.href,
        isFirstMessage: true,
        conversationId
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      
      setMessages([{
        sender: 'bot',
        text: data.response,
        confidence: data.confidence,
        bias: data.bias,
        uncertainty: data.uncertainty,
        isGreeting: true
      }]);
    } catch (err) {
      console.error('Greeting error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setClarificationOptions(null);
    setNotification(null);
    setAlternatives(null);
    setHandoff(null);
    setLoading(true);
    let botReply: Message;
    let docMatches: { text: string; source: string; score: number; chunk_index: number }[] = [];
    try {
      const requestBody = {
        message: text,
        context: pageContext ? getContextSummary(pageContext) : null,
        pageUrl: pageContext?.url || window.location.href,
        isFirstMessage: false,
        conversationId,
        userProfile
      };

      // Call chat API
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      // Show clarifying prompt if ambiguous
      if (data.ambiguous) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.response,
          bias: data.bias,
          uncertainty: data.uncertainty,
          isClarification: true,
          intent: data.intent,
          context: data.context
        }]);
        setClarificationOptions(data.clarificationOptions || null);
        setNotification(data.notification || null);
        setAlternatives(data.alternatives || null);
        setHandoff(data.handoffRequired ? { required: true, method: data.handoffMethod } : null);
        return;
      }
      botReply = {
        sender: 'bot',
        text: data.response,
        bias: data.bias,
        uncertainty: data.uncertainty,
        intent: data.intent,
        context: data.context
      };
      setNotification(data.notification || null);
      setAlternatives(data.alternatives || null);
      setHandoff(data.handoffRequired ? { required: true, method: data.handoffMethod } : null);

      // Call semantic search API
      const searchRes = await fetch(SEARCH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const searchData = await searchRes.json();
      docMatches = Array.isArray(searchData.matches) ? searchData.matches.slice(0, 3) : [];

      const newMessages: Message[] = [
        botReply,
      ];
      if (docMatches.length > 0) {
        newMessages.push({
          sender: 'docs',
          matches: docMatches
        });
      }
      setMessages(prev => [...prev, ...newMessages]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'I apologize, but something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handler for clarification option click
  const handleClarificationClick = (option: string) => {
    handleSend(option);
  };

  // Mouse event handlers for resizing
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const y = e.clientY;
      const chatRect = document.getElementById('aldeia-chat-widget')?.getBoundingClientRect();
      if (chatRect) {
        let newHeight = y - chatRect.top - 56; // header height
        newHeight = Math.max(120, Math.min(newHeight, (isFullScreen ? window.innerHeight : 500) - 120));
        setMessagesHeight(newHeight);
      }
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, isFullScreen]);

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        onClick={() => setIsMinimized(false)}
        role="button"
        aria-label="Open Aldeia Advisor"
      >
        <div style={{ color: 'white', fontSize: 24 }}>💬</div>
      </div>
    );
  }

  return (
    <div
      id="aldeia-chat-widget"
      style={{
        position: isFullScreen ? 'fixed' : 'fixed',
        top: isFullScreen ? 0 : 'auto',
        left: isFullScreen ? 0 : 'auto',
        bottom: isFullScreen ? 0 : 24,
        right: isFullScreen ? 0 : 24,
        width: isFullScreen ? '100vw' : 380,
        height: isFullScreen ? '100vh' : 500,
        background: '#fff',
        border: isFullScreen ? 'none' : '1px solid #e0e0e0',
        borderRadius: isFullScreen ? 0 : 16,
        boxShadow: isFullScreen ? '0 0 0 rgba(0,0,0,0)' : '0 8px 32px rgba(0,0,0,0.12)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
      role="region"
      aria-label="Aldeia Advisor"
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>Aldeia Advisor</div>
          {pageContext && (
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Context: {pageContext.title}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowProfile(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4
            }}
            aria-label="Profile/settings"
            title="Profile/settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setIsFullScreen(f => !f)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4
            }}
            aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? '🗗' : '🗖'}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4
            }}
            aria-label="Minimize chat"
          >
            −
          </button>
        </div>
      </div>
      
      {/* Messages and docs section, now resizable */}
      <div
        style={{
          flex: 'none',
          height: messagesHeight,
          minHeight: 120,
          maxHeight: isFullScreen ? '80vh' : 380,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {notification && (
          <div style={{
            background: '#ffe082',
            color: '#795548',
            padding: '10px 18px',
            borderRadius: 10,
            margin: '12px 24px 0 24px',
            fontWeight: 500,
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(255, 224, 130, 0.15)'
          }}>
            <span role="img" aria-label="Notification" style={{ marginRight: 8 }}>🔔</span>
            {notification}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MessageList messages={messages} isFullScreen={isFullScreen} />
        </div>
        {alternatives && alternatives.length > 0 && (
          <details style={{ margin: '12px 0 0 0', padding: '0 16px' }} open={isFullScreen}>
            <summary style={{ cursor: 'pointer', color: '#764ba2', fontWeight: 500, fontSize: 13 }}>
              See other perspectives
            </summary>
            <div style={{ marginTop: 8, maxHeight: isFullScreen ? '40vh' : 200, overflowY: 'auto' }}>
              {alternatives.map((alt, idx) => (
                <div key={idx} style={{
                  background: '#f8f6ff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 8
                }}>
                  <div style={{ fontSize: 13, color: '#333', marginBottom: 4 }}>{alt.answer}</div>
                  <div style={{ fontSize: 11, color: '#764ba2' }}>Source: {alt.source}</div>
                </div>
              ))}
            </div>
          </details>
        )}
        {handoff && handoff.required && (
          <div style={{
            background: '#fff3e0',
            color: '#b26a00',
            border: '1px solid #ffe0b2',
            borderRadius: 10,
            margin: '16px',
            padding: '18px 20px',
            fontWeight: 500,
            fontSize: 15,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(255, 224, 130, 0.10)'
          }}>
            <div style={{ marginBottom: 10 }}>It looks like you may need help from a human advisor.</div>
            <a href={`mailto:support@aldeiaadvisor.com?subject=Fire Recovery Help&body=Name: ${encodeURIComponent(userProfile.name || '')}%0ACounty: ${encodeURIComponent(userProfile.county || '')}%0AEmail: ${encodeURIComponent(userProfile.email || '')}%0AQuery: `} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: '#764ba2',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 15,
              marginTop: 6
            }}>
              Contact a Human Advisor
            </a>
          </div>
        )}
      </div>
      
      {/* Resize handle */}
      <div
        style={{
          height: 8,
          cursor: 'row-resize',
          background: isResizing ? '#e0e0e0' : 'transparent',
          transition: 'background 0.2s',
          zIndex: 10
        }}
        onMouseDown={startResize}
        aria-label="Resize chat area"
        title="Resize chat area"
      />
      
      {/* Input */}
      <div style={{ borderTop: '1px solid #e0e0e0', padding: '12px 16px' }}>
        <InputBox onSend={handleSend} disabled={loading} aria-label="Chat message input" />
        {loading && (
          <div style={{ 
            padding: '8px 0', 
            fontSize: 12, 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }} aria-live="polite">
            <div style={{
              width: 16,
              height: 16,
              border: '2px solid #e0e0e0',
              borderTop: '2px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Aldeia is thinking...
          </div>
        )}
        {clarificationOptions && clarificationOptions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {clarificationOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleClarificationClick(option)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: '1px solid #764ba2',
                  background: '#f8f6ff',
                  color: '#764ba2',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating handoff button */}
      {handoff && handoff.required && (
        <a
          href={`mailto:support@aldeiaadvisor.com?subject=Fire Recovery Help&body=Name: ${encodeURIComponent(userProfile.name || '')}%0ACounty: ${encodeURIComponent(userProfile.county || '')}%0AEmail: ${encodeURIComponent(userProfile.email || '')}%0AQuery: `}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            right: isFullScreen ? 32 : 8,
            bottom: isFullScreen ? 32 : 80,
            zIndex: 3001,
            background: '#764ba2',
            color: '#fff',
            borderRadius: '50%',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(118,75,162,0.18)',
            fontSize: 22,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          aria-label="Contact a Human Advisor"
          title="Contact a Human Advisor"
        >
          <span role="img" aria-label="Human">🧑‍💼</span>
        </a>
      )}
      
      {showProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <h3 style={{ marginTop: 0 }}>Profile & Settings</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              Name:<br />
              <input type="text" value={userProfile.name || ''} onChange={e => setUserProfile(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              County:<br />
              <input type="text" value={userProfile.county || ''} onChange={e => setUserProfile(p => ({ ...p, county: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              Email:<br />
              <input type="email" value={userProfile.email || ''} onChange={e => setUserProfile(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowProfile(false)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#764ba2', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;
