import { useEffect, useState, useRef, useCallback } from 'react';
import { useWebSocket, type WsChatMessage } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { authRequest } from '../../lib/apiClient';

interface ChatPartner {
  uid: string;
  displayName: string;
  initials: string;
  headline?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

export default function EmployerMessages() {
  const { userProfile } = useAuth();
  const ws = useWebSocket();

  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<WsChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myUid = userProfile?.uid || '';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat partners (candidates the employer has interacted with)
  useEffect(() => {
    let cancelled = false;
    const loadPartners = async () => {
      try {
        const res = await authRequest<{ partners: ChatPartner[] }>('/api/employer/chat-partners');
        if (!cancelled) setPartners(res.partners || []);
      } catch {
        // If endpoint doesn't exist yet, show an empty state with the account manager
        if (!cancelled) {
          setPartners([
            {
              uid: 'account-manager',
              displayName: 'Michael Rodriguez',
              initials: 'MR',
              headline: 'Enterprise Account Director',
              lastMessage: 'Welcome to EliteRecruit! How can I help you today?',
              lastMessageAt: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPartners();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to incoming chat messages
  useEffect(() => {
    const unsub = ws.subscribe('chat_message', (data: any) => {
      const msg = data.message as WsChatMessage;
      if (!msg) return;

      // Update messages if it's the current conversation
      if (selectedPartner && (msg.senderUid === selectedPartner.uid || msg.recipientUid === selectedPartner.uid)) {
        setMessages(prev => [...prev, msg]);
      }

      // Update partners list with last message
      setPartners(prev =>
        prev.map(p => {
          if (p.uid === msg.senderUid || p.uid === msg.recipientUid) {
            return { ...p, lastMessage: msg.content, lastMessageAt: msg.timestamp };
          }
          return p;
        })
      );
    });
    return unsub;
  }, [ws, selectedPartner]);

  // Subscribe to chat history responses
  useEffect(() => {
    const unsub = ws.subscribe('chat_history', (data: any) => {
      if (data.messages) {
        setMessages(data.messages);
      }
    });
    return unsub;
  }, [ws]);

  // Select a partner and load history
  const selectPartner = useCallback((partner: ChatPartner) => {
    setSelectedPartner(partner);
    setMessages([]);
    ws.requestChatHistory(partner.uid);
  }, [ws]);

  // Send a message
  const handleSend = () => {
    if (!newMessage.trim() || !selectedPartner) return;
    ws.sendChatMessage(selectedPartner.uid, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts?: string | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return d.toLocaleDateString();
  };

  return (
    <div className="empr-messages-layout">
      {/* Conversations Sidebar */}
      <div className="empr-messages-sidebar">
        <div className="empr-messages-sidebar-header">
          <h3 className="empr-messages-title">Messages</h3>
          {ws.connected && <span className="empr-ws-status connected">Live</span>}
          {!ws.connected && <span className="empr-ws-status disconnected">Offline</span>}
        </div>

        <div className="empr-messages-search">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}>search</span>
          <input type="text" placeholder="Search conversations..." className="empr-messages-search-input" />
        </div>

        <div className="empr-messages-list">
          {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)', fontSize: 13 }}>Loading conversations...</p>}
          {!loading && partners.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 8 }}>chat_bubble_outline</span>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>No conversations yet.<br />Messages with candidates will appear here.</p>
            </div>
          )}
          {partners.map(partner => (
            <button
              key={partner.uid}
              className={`empr-messages-partner${selectedPartner?.uid === partner.uid ? ' active' : ''}`}
              onClick={() => selectPartner(partner)}
            >
              <div className="empr-messages-partner-avatar">
                {partner.initials}
              </div>
              <div className="empr-messages-partner-info">
                <div className="empr-messages-partner-top">
                  <span className="empr-messages-partner-name">{partner.displayName}</span>
                  <span className="empr-messages-partner-time">{formatTime(partner.lastMessageAt)}</span>
                </div>
                <p className="empr-messages-partner-preview">{partner.lastMessage || partner.headline || 'No messages yet'}</p>
              </div>
              {partner.unread ? <span className="empr-messages-unread">{partner.unread}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="empr-messages-chat">
        {!selectedPartner ? (
          <div className="empr-messages-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>forum</span>
            <h3 style={{ marginTop: 16, color: 'var(--color-on-surface-variant)' }}>Select a conversation</h3>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>Choose from your existing conversations or start a new one from a candidate profile.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="empr-messages-chat-header">
              <button className="empr-messages-back-btn" onClick={() => setSelectedPartner(null)}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="empr-messages-partner-avatar small">
                {selectedPartner.initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{selectedPartner.displayName}</p>
                <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                  {selectedPartner.headline || 'Candidate'}
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>videocam</span>
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="empr-messages-body">
              {messages.length === 0 && (
                <div className="empr-messages-day-divider">
                  <span>Start of conversation</span>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.senderUid === myUid;
                return (
                  <div key={msg.id || i}>
                    <div className={`emp-chat-msg ${isMine ? 'sent' : 'received'}`}>
                      {msg.content}
                    </div>
                    <p className="emp-chat-msg-time" style={{ textAlign: isMine ? 'right' : 'left' }}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="emp-chat-input-bar">
              <button style={{ color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <input
                className="emp-chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button
                className="emp-chat-send-btn"
                onClick={handleSend}
                disabled={!newMessage.trim()}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
