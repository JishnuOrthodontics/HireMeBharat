import { useEffect, useState } from 'react';
import { getConciergeMessages, sendConciergeMessage, type ConciergeApi } from '../../lib/employeeApi';

export default function EmployeeConcierge() {
  const [newMessage, setNewMessage] = useState('');
  const [data, setData] = useState<ConciergeApi | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

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

  const onSend = async () => {
    const content = newMessage.trim();
    if (!content) return;
    setSending(true);
    setError('');
    try {
      const res = await sendConciergeMessage(content);
      setData((prev) => prev ? { ...prev, messages: [...prev.messages, res.message] } : prev);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Unable to send message');
    } finally {
      setSending(false);
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
            <span className="emp-online-dot" /> {data?.concierge?.online ? 'Online now' : 'Offline'} · {data?.concierge?.title || 'Concierge'}
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
          <div key={i}>
            <div className={`emp-chat-msg ${msg.from === 'user' ? 'sent' : 'received'}`}>
              {msg.content}
            </div>
            <p className="emp-chat-msg-time" style={{ textAlign: msg.from === 'user' ? 'right' : 'left' }}>
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        ))}
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
        />
        <button className="emp-chat-send-btn" onClick={onSend} disabled={sending || !newMessage.trim()}>
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}

