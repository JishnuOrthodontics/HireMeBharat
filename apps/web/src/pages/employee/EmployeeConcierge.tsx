import { useEffect, useState, useRef } from 'react';
import { getConciergeMessages, type ConciergeApi, type ConciergeMessageApi } from '../../lib/employeeApi';
import { useWebSocket } from '../../contexts/WebSocketContext';

export default function EmployeeConcierge() {
  const [newMessage, setNewMessage] = useState('');
  const [data, setData] = useState<ConciergeApi | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const ws = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  // Load initial messages via REST
  const load = async () => {
    setError('');
    try {
      const res = await getConciergeMessages();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Unable to load messages');
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Subscribe to live concierge messages via WebSocket
  useEffect(() => {
    const unsub = ws.subscribe('concierge_message', (payload: any) => {
      const msg = payload.message as ConciergeMessageApi;
      if (!msg) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: msg.id,
                  from: msg.from,
                  content: msg.content,
                  timestamp: msg.timestamp,
                },
              ],
            }
          : prev
      );
    });
    return unsub;
  }, [ws]);

  // Send via WebSocket if connected, fall back to REST
  const onSend = async () => {
    const content = newMessage.trim();
    if (!content) return;
    setSending(true);
    setError('');

    if (ws.connected) {
      // Send via WebSocket — the backend will echo back the message + bot reply
      ws.sendConciergeMessage(content);
      setNewMessage('');
      setSending(false);
    } else {
      // Fallback to REST
      try {
        const { sendConciergeMessage: sendRest } = await import('../../lib/employeeApi');
        const res = await sendRest(content);
        setData((prev) => prev ? { ...prev, messages: [...prev.messages, res.message] } : prev);
        setNewMessage('');
      } catch (err: any) {
        setError(err.message || 'Unable to send message');
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="dash-card emp-chat-container">
      {/* Chat Header */}
      <div className="emp-chat-header">
        <div className="emp-concierge-avatar">{data?.concierge?.initials || 'SJ'}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 15 }}>{data?.concierge?.name || 'Talent Concierge'}</p>
          <p className="emp-concierge-status">
            <span className="emp-online-dot" style={{
              backgroundColor: ws.connected ? 'var(--color-success, #50fa7b)' : (data?.concierge?.online ? 'var(--color-success)' : 'var(--color-on-surface-variant)')
            }} />
            {' '}{ws.connected ? 'Live connected' : (data?.concierge?.online ? 'Online now' : 'Offline')} · {data?.concierge?.title || 'Concierge'}
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>videocam</span>
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="emp-chat-messages">
        {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}
        {!data && !error && <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading conversation...</p>}
        {data?.messages.map((msg, i) => (
          <div key={msg.id || i}>
            <div className={`emp-chat-msg ${msg.from === 'user' ? 'sent' : 'received'}`}>
              {msg.content}
            </div>
            <p className="emp-chat-msg-time" style={{ textAlign: msg.from === 'user' ? 'right' : 'left' }}>
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        ))}
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
        <button className="emp-chat-send-btn" onClick={onSend} disabled={sending || !newMessage.trim()}>
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
