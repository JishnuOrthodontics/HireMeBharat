import { useState } from 'react';

const messages = [
  { from: 'concierge', text: "Good morning, Alex! I've reviewed the three new opportunities that surfaced overnight. There's one in particular that I think is an exceptional fit.", time: '9:41 AM' },
  { from: 'user', text: "Great, which one stands out?", time: '9:43 AM' },
  { from: 'concierge', text: "The VP of Product Engineering at the Stealth AI Startup — 94% match score. Their engineering culture mirrors what you described wanting, and the equity package is compelling given their Series C momentum.", time: '9:44 AM' },
  { from: 'user', text: "Interesting. What's their funding runway look like?", time: '9:45 AM' },
  { from: 'concierge', text: "They raised $180M at a $1.2B valuation 8 months ago. I have insider intel that they're growing 3x YoY and planning an IPO within 18 months. Shall I schedule an introductory call with their CTO?", time: '9:47 AM' },
  { from: 'user', text: "Yes please! What should I prepare?", time: '9:48 AM' },
  { from: 'concierge', text: "I'll put together a briefing deck with their tech stack, team structure, and key talking points tailored to your experience. Expect it in your inbox within the hour. I'll also include competitive comp data for similar roles.", time: '9:50 AM' },
];

export default function EmployeeConcierge() {
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="dash-card emp-chat-container">
      {/* Chat Header */}
      <div className="emp-chat-header">
        <div className="emp-concierge-avatar">SJ</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 15 }}>Sarah Jenkins</p>
          <p className="emp-concierge-status">
            <span className="emp-online-dot" /> Online now · Senior Talent Concierge
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
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`emp-chat-msg ${msg.from === 'user' ? 'sent' : 'received'}`}>
              {msg.text}
            </div>
            <p className="emp-chat-msg-time" style={{ textAlign: msg.from === 'user' ? 'right' : 'left' }}>
              {msg.time}
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
        <button className="emp-chat-send-btn">
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
