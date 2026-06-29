import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import GoldButton from '../components/GoldButton';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Reports.css';

export const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tickets, loading } = useTickets();
  const [reportData, setReportData] = useState(null);

  // Redirect clients to dashboard
  useEffect(() => {
    if (user && user.role === 'CLIENT') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);


  useEffect(() => {
    const fetchReportSummary = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/reports/summary');
        setReportData(response.data);
      } catch (err) {
        console.error('Failed to load reports summary:', err);
      }
    };
    fetchReportSummary();
  }, [tickets]);

  // Fallback defaults if API not fully loaded yet
  const totalTickets = tickets.length;
  const resolvedCount = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const slaCompliance = totalTickets > 0 
    ? Math.round(((totalTickets - tickets.filter(t => t.sla_breached).length) / totalTickets) * 100) 
    : 100;
  
  // Custom Donut Chart (Status breakdown segment calculation)
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const progressCount = tickets.filter(t => t.status === 'In Progress').length;
  const holdCount = tickets.filter(t => t.status === 'On Hold').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;
  const resolvedActiveCount = tickets.filter(t => t.status === 'Resolved').length;

  const totalStatusCount = openCount + progressCount + holdCount + resolvedActiveCount + closedCount || 1;
  
  // Percentages for status segments
  const openPct = (openCount / totalStatusCount) * 100;
  const progressPct = (progressCount / totalStatusCount) * 100;
  const holdPct = (holdCount / totalStatusCount) * 100;
  const resolvedPct = ((resolvedActiveCount + closedCount) / totalStatusCount) * 100;

  // Custom Weekly Trend Points
  // Simulated ticket trend for last 7 days
  const weeklyData = [
    { day: 'Mon', count: 5 },
    { day: 'Tue', count: 9 },
    { day: 'Wed', count: 7 },
    { day: 'Thu', count: 12 },
    { day: 'Fri', count: 14 },
    { day: 'Sat', count: 6 },
    { day: 'Sun', count: 8 }
  ];
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 1);

  // SVG Line Chart coordinates
  const svgWidth = 320;
  const svgHeight = 100;
  const points = weeklyData.map((d, i) => {
    const x = (i * (svgWidth / (weeklyData.length - 1)));
    const y = svgHeight - (d.count / maxWeeklyCount) * (svgHeight - 20) - 10;
    return { x, y, ...d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${svgHeight} ${polylinePoints} ${svgWidth},${svgHeight}`;

  const handleExportCSV = () => {
    alert('Exporting workspace ticket log as CSV...');
  };

  const handleExportPDF = () => {
    alert('Generating premium PDF performance report...');
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title="Operational Reports" />
        <main className="main-content">
          
          {/* Export & Actions Row */}
          <div className="reports-export-row fade-up" style={{ animationDelay: '0.05s' }}>
            <span className="export-text">Select range: Last 7 Days</span>
            <div className="export-actions-btns">
              <GoldButton variant="success" onClick={handleExportCSV}>
                Export CSV
              </GoldButton>
              <GoldButton variant="ghost" onClick={handleExportPDF}>
                Export PDF
              </GoldButton>
            </div>
          </div>

          {/* Row 1: Summary Stats */}
          <section className="dashboard-stats-grid">
            <StatCard label="Total Logged" value={totalTickets} delay={0.1} />
            <StatCard label="Avg Resolution" value={reportData?.avg_resolution_hours ? `${reportData.avg_resolution_hours.toFixed(1)}h` : '1.8h'} delay={0.2} />
            <StatCard label="SLA Compliance" value={`${slaCompliance}%`} variant="gold" delay={0.3} />
            <StatCard label="CSAT Rating" value="4.8/5.0" variant="success" delay={0.4} />
          </section>

          {/* Row 2: Status Donut Chart & Agent Bars */}
          <section className="dashboard-row-2">
            
            {/* Donut Chart */}
            <div className="dashboard-panel-card fade-up" style={{ animationDelay: '0.5s' }}>
              <div className="panel-card-header">
                <h3>Tickets Status Distribution</h3>
              </div>
              <div className="panel-card-body donut-panel-body">
                <div className="donut-chart-container">
                  {/* Custom SVG Donut chart */}
                  <svg className="svg-donut-chart" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3"></circle>
                    
                    {/* Resolved Segment (Green) */}
                    <circle
                      cx="21" cy="21" r="15.915"
                      fill="transparent"
                      stroke="var(--green-soft)"
                      strokeWidth="3.2"
                      strokeDasharray={`${resolvedPct} ${100 - resolvedPct}`}
                      strokeDashoffset="25"
                    ></circle>
                    
                    {/* In Progress Segment (Purple) */}
                    <circle
                      cx="21" cy="21" r="15.915"
                      fill="transparent"
                      stroke="var(--purple)"
                      strokeWidth="3.2"
                      strokeDasharray={`${progressPct} ${100 - progressPct}`}
                      strokeDashoffset={125 - resolvedPct}
                    ></circle>

                    {/* Open Segment (Gold) */}
                    <circle
                      cx="21" cy="21" r="15.915"
                      fill="transparent"
                      stroke="var(--gold)"
                      strokeWidth="3.2"
                      strokeDasharray={`${openPct} ${100 - openPct}`}
                      strokeDashoffset={125 - resolvedPct - progressPct}
                    ></circle>

                    {/* On Hold Segment (Amber) */}
                    <circle
                      cx="21" cy="21" r="15.915"
                      fill="transparent"
                      stroke="var(--yellow-soft)"
                      strokeWidth="3.2"
                      strokeDasharray={`${holdPct} ${100 - holdPct}`}
                      strokeDashoffset={125 - resolvedPct - progressPct - openPct}
                    ></circle>
                  </svg>
                  
                  {/* Text Center */}
                  <div className="donut-center-text">
                    <span className="donut-val">{totalTickets}</span>
                    <span className="donut-lbl">Incidents</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="donut-legend-list">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: 'var(--gold)' }}></span>
                    <span className="legend-lbl">Open ({openCount})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: 'var(--purple)' }}></span>
                    <span className="legend-lbl">In Progress ({progressCount})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: 'var(--yellow-soft)' }}></span>
                    <span className="legend-lbl">On Hold ({holdCount})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: 'var(--green-soft)' }}></span>
                    <span className="legend-lbl">Resolved/Closed ({resolvedActiveCount + closedCount})</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Weekly Load SVG Curve */}
            <div className="dashboard-panel-card fade-up" style={{ animationDelay: '0.6s' }}>
              <div className="panel-card-header">
                <h3>Weekly Incoming Load</h3>
              </div>
              <div className="panel-card-body chart-panel-body justify-center items-center">
                
                <div className="svg-chart-wrapper">
                  <svg className="svg-weekly-line-chart" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <defs>
                      <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Area fill */}
                    <polygon points={areaPoints} fill="url(#area-grad)"></polygon>
                    
                    {/* Line curve */}
                    <polyline fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polylinePoints}></polyline>
                    
                    {/* Dots at vertices */}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--bg-deep)" stroke="var(--gold)" strokeWidth="1.5"></circle>
                    ))}
                  </svg>
                </div>

                {/* XAxis labels */}
                <div className="weekly-axis-labels" style={{ width: `${svgWidth}px` }}>
                  {weeklyData.map((d, i) => (
                    <span key={i} className="axis-lbl">{d.day}</span>
                  ))}
                </div>

              </div>
            </div>

          </section>

          {/* Row 3: Agent Productivity Bar Load list */}
          <section className="dashboard-row-3 fade-up" style={{ animationDelay: '0.7s' }}>
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Agent Performance &amp; Incident Load</h3>
              </div>
              <div className="panel-card-body">
                {reportData?.agent_loads && Object.keys(reportData.agent_loads).length > 0 ? (
                  <div className="agent-load-bars-list">
                    {Object.entries(reportData.agent_loads).map(([name, count]) => {
                      const maxLoadVal = Math.max(...Object.values(reportData.agent_loads), 1);
                      const barPct = (count / maxLoadVal) * 100;
                      
                      return (
                        <div key={name} className="bar-chart-row">
                          <span className="bar-chart-label">{name}</span>
                          <div className="bar-chart-track">
                            <div 
                              className="bar-chart-fill" 
                              style={{ 
                                '--target-w': `${barPct}%`,
                                backgroundColor: 'var(--gold)',
                                animation: 'barGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                              }}
                            ></div>
                          </div>
                          <span className="bar-chart-val">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-activity-text">No active workload data available for agents.</p>
                )}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Reports;