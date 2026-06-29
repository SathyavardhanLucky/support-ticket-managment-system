import React, { useState, useEffect } from 'react';
import './SLATimer.css';

export const SLATimer = ({ deadline }) => {
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      const diff = deadlineDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsBreached(true);
        setTimeLeftMs(0);
      } else {
        setIsBreached(false);
        setTimeLeftMs(diff);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Format time string
  const formatTime = (ms) => {
    if (ms <= 0) return 'BREACHED';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    let str = '';
    if (hrs > 0) str += `${hrs}h `;
    str += `${mins}m ${secs}s`;
    return str;
  };

  // Determine SLA color state
  // Green: > 4h (14400000 ms)
  // Amber: 1h - 4h (3600000 - 14400000 ms)
  // Red: < 1h (< 3600000 ms)
  const getSLAState = () => {
    if (isBreached) return 'breached';
    if (timeLeftMs > 14400000) return 'normal';
    if (timeLeftMs > 3600000) return 'urgent';
    return 'critical';
  };

  // Estimate total SLA duration to render progress bar percentage
  const getProgressPercentage = () => {
    if (isBreached) return 100;
    
    let totalDurationMs = 14400000; // default 4h
    if (timeLeftMs > 86400000) {
      totalDurationMs = 259200000; // 72h
    } else if (timeLeftMs > 28800000) {
      totalDurationMs = 86400000; // 24h
    } else if (timeLeftMs > 14400000) {
      totalDurationMs = 28800000; // 8h
    }
    
    // Percentage of time ELAPSED (bar fills up as time runs out)
    const elapsedMs = totalDurationMs - timeLeftMs;
    return Math.max(0, Math.min(100, (elapsedMs / totalDurationMs) * 100));
  };

  const stateClass = getSLAState();
  const percentage = getProgressPercentage();

  return (
    <div className={`sla-timer-card ${stateClass}`}>
      <div className="sla-timer-header">
        <span className="sla-timer-title">SLA Remaining</span>
        <div className="sla-timer-clock">
          {stateClass === 'critical' && (
            <span className="sla-warning-icon" title="SLA under 1 hour!">⚠️</span>
          )}
          <span className="sla-time-string">{formatTime(timeLeftMs)}</span>
        </div>
      </div>
      <div className="sla-progress-track">
        <div
          className="sla-progress-fill"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SLATimer;
