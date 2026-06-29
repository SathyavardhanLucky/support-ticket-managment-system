import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './AIAssistantPanel.css';

export const AIAssistantPanel = ({ ticket }) => {
  const [loading, setLoading] = useState(false);
  const [typedResponse, setTypedResponse] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [history, setHistory] = useState([]);
  const [showInput, setShowInput] = useState(false);

  const rawResponseRef = useRef('');
  const typingTimerRef = useRef(null);

  // Clean typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  // Simulator typing effect
  const startTypingEffect = (text) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setTypedResponse('');
    rawResponseRef.current = text;
    
    let index = 0;
    typingTimerRef.current = setInterval(() => {
      setTypedResponse((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(typingTimerRef.current);
      }
    }, 10); // 10ms per char for snappy typing
  };

  const triggerAIAction = async (actionName) => {
    setLoading(true);
    setTypedResponse('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/ai/assist`, {
        ticket_id: ticket.id,
        action: actionName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resText = response.data.ai_response;
      startTypingEffect(resText);
      setHistory([{ role: 'assistant', content: resText }]);
    } catch (err) {
      const errText = `Error: ${err.response?.data?.error || 'AI assistance failed'}`;
      startTypingEffect(errText);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setTypedResponse('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/ai/assist`, {
        ticket_id: ticket.id,
        action: 'chat',
        message: userMsg
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resText = response.data.ai_response;
      setHistory((prev) => [...prev, { role: 'assistant', content: resText }]);
      startTypingEffect(resText);
    } catch (err) {
      const errText = `Error: ${err.response?.data?.error || 'AI failed to reply'}`;
      setHistory((prev) => [...prev, { role: 'assistant', content: errText }]);
      startTypingEffect(errText);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (rawResponseRef.current) {
      navigator.clipboard.writeText(rawResponseRef.current);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="ai-copilot-container">
      <div className="ai-copilot-header">
        <span className="sparkle-icon">✨</span>
        <h4>Crownridge AI Co-pilot</h4>
      </div>

      <div className="ai-copilot-grid">
        <button className="ai-pill-btn" onClick={() => triggerAIAction('summarize')} disabled={loading}>
          📝 Summarize
        </button>
        <button className="ai-pill-btn" onClick={() => triggerAIAction('suggest_resolution')} disabled={loading}>
          💡 Suggest Fix
        </button>
        <button className="ai-pill-btn" onClick={() => triggerAIAction('generate_reply')} disabled={loading}>
          📧 Draft Reply
        </button>
        <button className="ai-pill-btn" onClick={() => triggerAIAction('detect_scope_creep')} disabled={loading}>
          🕵️ Scope Check
        </button>
        <button className={`ai-pill-btn ${showInput ? 'active' : ''}`} onClick={() => setShowInput(!showInput)} disabled={loading}>
          💬 Free Chat
        </button>
      </div>

      {showInput && (
        <form className="ai-free-chat-form" onSubmit={handleSendChat}>
          <input
            type="text"
            className="dark-input"
            placeholder="Ask anything about this incident..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="ai-send-btn" disabled={loading || !chatInput.trim()}>
            Send
          </button>
        </form>
      )}

      {/* Response Box */}
      {(typedResponse || loading) && (
        <div className="ai-response-box">
          <div className="ai-response-header">
            <span>Claude Co-pilot</span>
            {typedResponse && !loading && (
              <button className="ai-box-copy-btn" onClick={handleCopyText}>
                Copy
              </button>
            )}
          </div>
          <div className="ai-response-text" style={{ whiteSpace: 'pre-wrap' }}>
            {typedResponse}
            {loading && (
              <div className="ai-pulsing-loader">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPanel;
