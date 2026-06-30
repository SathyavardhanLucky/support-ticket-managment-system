import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import GoldButton from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './NewTicket.css';

export const NewTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Website');
  const [priority, setPriority] = useState('Medium');
  const [severity, setSeverity] = useState('Medium');
  
  // Simulated attachment states
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // AI assist states
  const [aiAssistOn, setAiAssistOn] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiReason, setAiReason] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  // Form validation shake state
  const [shakeForm, setShakeForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Segmented control priority colors mapping
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  // Call backend AI Suggestion on Description blur
  const handleDescriptionBlur = async () => {
    if (!aiAssistOn || !description.trim()) return;

    setSuggesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/ai/suggest-priority`, {
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { suggested_priority, reason } = response.data;
      setAiSuggestion(suggested_priority);
      setAiReason(reason);
      
      // Auto-set the priority field to the suggested value!
      setPriority(suggested_priority);
    } catch (err) {
      console.error('AI suggest priority failed:', err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple Validation
    if (!title.trim() || !description.trim()) {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    setLoading(true);
    try {
      const severityMap = {
        'Low': 'Minor',
        'Medium': 'Major',
        'High': 'Critical',
        'Critical': 'Blocker'
      };
      
      const payload = {
        title,
        description,
        category,
        priority,
        severity: severityMap[severity] || 'Minor'
      };
      
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/tickets`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/tickets/${response.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log support ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title="Log Incident" />
        <main className="main-content">
          
          <div className="new-ticket-centered-wrapper">
            <div className={`dark-glass-card new-ticket-form-card ${shakeForm ? 'shake-form' : ''} fade-up`} style={{ animationDelay: '0.1s' }}>
              <div className="form-card-header">
                <h3>Submit Support Ticket</h3>
                <p>Log a new service issue inside the Crownridge LLP workspace.</p>
              </div>

              <form onSubmit={handleSubmit} className="new-ticket-form">
                
                {/* Title */}
                <div className="form-group-custom">
                  <label className="dark-label">Ticket Title *</label>
                  <input
                    type="text"
                    className="dark-input"
                    placeholder="Brief summary of the support issue..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group-custom">
                  <label className="dark-label">Problem Description *</label>
                  <textarea
                    className="dark-input"
                    rows="5"
                    placeholder="Provide details about the issue. Include steps to reproduce or any error codes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    required
                  ></textarea>
                </div>

                {/* Category & Severity dropdowns */}
                <div className="form-row-double">
                  <div className="form-group-custom">
                    <label className="dark-label">Category</label>
                    <select
                      className="dark-input"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Website">Website</option>
                      <option value="App">App</option>
                      <option value="Software">Software</option>
                      <option value="Hosting">Hosting</option>
                      <option value="Bug">Bug</option>
                      <option value="Change Request">Change Request</option>
                    </select>
                  </div>

                  <div className="form-group-custom">
                    <label className="dark-label">Severity Level</label>
                    <select
                      className="dark-input"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="Low">Low - minor impact</option>
                      <option value="Medium">Medium - functional issue</option>
                      <option value="High">High - critical process block</option>
                      <option value="Critical">Critical - complete down</option>
                    </select>
                  </div>
                </div>

                {/* Priority Segmented Control */}
                <div className="form-group-custom">
                  <label className="dark-label">Priority level (SLA trigger)</label>
                  <div className="priority-segmented-control">
                    {priorityOptions.map((opt) => {
                      const isActive = priority === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`segmented-button btn-prio-${opt.toLowerCase()} ${isActive ? 'active' : ''}`}
                          onClick={() => setPriority(opt)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Attachment Drag Drop zone */}
                <div className="form-group-custom">
                  <label className="dark-label">Attachments</label>
                  <div
                    className={`attachment-drag-zone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload-input"
                      multiple={false}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload-input" className="drag-zone-label">
                      <span className="upload-icon">📂</span>
                      {fileName ? (
                        <p className="file-attached-name">Attached: <strong>{fileName}</strong></p>
                      ) : (
                        <p>Drag and drop a file here, or <span className="browse-link">browse files</span></p>
                      )}
                    </label>
                  </div>
                </div>

                {/* AI Assist priority chip */}
                <div className="ai-assist-chip-wrapper">
                  <div className="ai-toggle-row">
                    <label className="ai-switch-lbl">
                      <input
                        type="checkbox"
                        checked={aiAssistOn}
                        onChange={(e) => setAiAssistOn(e.target.checked)}
                      />
                      <span className="ai-switch-text">Let AI auto-classify priority from description</span>
                    </label>
                    {suggesting && <span className="ai-analyzing-spinner">Analyzing...</span>}
                  </div>
                  
                  {aiSuggestion && (
                    <div className="ai-suggestion-badge-alert fade-in">
                      <span className="sparkle-bullet">✨</span>
                      <span>
                        AI suggests priority: <strong>{aiSuggestion}</strong> — {aiReason}.
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="submit-btn-row">
                  <GoldButton type="submit" loading={loading} className="submit-ticket-btn-full">
                    Log Support Incident
                  </GoldButton>
                </div>

              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default NewTicket;
