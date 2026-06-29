import csv
import io
from flask import Blueprint, jsonify, Response, request
from models import db, Ticket, User
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
import datetime

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role not in ['SUPPORT_MANAGER', 'ADMIN', 'TECH_LEAD', 'SUPPORT_AGENT']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    total_tickets = Ticket.query.count()
    
    # By Status
    status_counts = db.session.query(Ticket.status, func.count(Ticket.id))\
        .group_by(Ticket.status).all()
    status_map = {status: count for status, count in status_counts}
    for st in ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed']:
        if st not in status_map:
            status_map[st] = 0
            
    # By Priority
    priority_counts = db.session.query(Ticket.priority, func.count(Ticket.id))\
        .group_by(Ticket.priority).all()
    priority_map = {priority: count for priority, count in priority_counts}
    for pr in ['Low', 'Medium', 'High', 'Critical']:
        if pr not in priority_map:
            priority_map[pr] = 0
            
    # By Category
    category_counts = db.session.query(Ticket.category, func.count(Ticket.id))\
        .group_by(Ticket.category).all()
    category_map = {category: count for category, count in category_counts}
    
    # Backlog (Open + In Progress + On Hold)
    backlog_count = Ticket.query.filter(Ticket.status.notin_(['Resolved', 'Closed'])).count()
    
    # SLA Breached
    sla_breached_count = Ticket.query.filter_by(sla_breached=True).count()
    
    # SLA At Risk (not resolved, and deadline is less than 2 hours from now)
    now_time = datetime.datetime.utcnow()
    risk_time = now_time + datetime.timedelta(hours=2)
    sla_at_risk_count = Ticket.query.filter(
        Ticket.status.notin_(['Resolved', 'Closed']),
        Ticket.sla_deadline <= risk_time,
        Ticket.sla_deadline >= now_time
    ).count()
    
    # SLA Compliance rate
    compliance_rate = round(((total_tickets - sla_breached_count) / total_tickets * 100), 1) if total_tickets > 0 else 100.0
    
    # Average resolution time in hours
    resolved_tickets = Ticket.query.filter(Ticket.resolved_at.isnot(None)).all()
    total_res_time = 0
    res_count = len(resolved_tickets)
    for t in resolved_tickets:
        delta = t.resolved_at - t.created_at
        total_res_time += delta.total_seconds() / 3600.0
    avg_res_time_hours = total_res_time / res_count if res_count > 0 else 0.0

    # Critical Incidents Count
    critical_incidents_count = Ticket.query.filter(Ticket.priority == 'Critical').count()
    
    # Agent Utilization & Performance list
    agents = User.query.filter(User.role.in_(['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'ADMIN'])).all()
    agent_perf = []
    total_utilization = 0
    agent_count = 0
    
    for a in agents:
        open_cnt = Ticket.query.filter(Ticket.assigned_agent_id == a.id, Ticket.status.notin_(['Resolved', 'Closed'])).count()
        res_cnt = Ticket.query.filter(Ticket.assigned_agent_id == a.id, Ticket.status.in_(['Resolved', 'Closed'])).count()
        util = min(100, open_cnt * 20) # Mock utilization percentage
        total_utilization += util
        agent_count += 1
        
        agent_perf.append({
            'id': a.id,
            'name': a.name,
            'role': a.role,
            'availability': a.availability if hasattr(a, 'availability') else 'ONLINE',
            'open_count': open_cnt,
            'resolved_count': res_cnt,
            'csat_rating': round(4.5 + (a.id % 5) * 0.1, 1),
            'utilization': util
        })
        
    avg_agent_utilization = round(total_utilization / agent_count, 1) if agent_count > 0 else 0.0

    # Mock trends and busiest hours for charts
    monthly_trends = [
        {'month': 'Jan', 'tickets': 24},
        {'month': 'Feb', 'tickets': 32},
        {'month': 'Mar', 'tickets': 45},
        {'month': 'Apr', 'tickets': 38},
        {'month': 'May', 'tickets': 54},
        {'month': 'Jun', 'tickets': total_tickets + 12}
    ]
    
    busiest_hours = [
        {'hour': '09:00', 'count': 15},
        {'hour': '10:00', 'count': 28},
        {'hour': '11:00', 'count': 32},
        {'hour': '12:00', 'count': 18},
        {'hour': '14:00', 'count': 22},
        {'hour': '15:00', 'count': 26},
        {'hour': '16:00', 'count': 29}
    ]
    
    busiest_days = [
        {'day': 'Mon', 'count': 42},
        {'day': 'Tue', 'count': 55},
        {'day': 'Wed', 'count': 49},
        {'day': 'Thu', 'count': 38},
        {'day': 'Fri', 'count': 30}
    ]

    return jsonify({
        'total_tickets': total_tickets,
        'by_status': status_map,
        'by_priority': priority_map,
        'by_category': category_map,
        'backlog_count': backlog_count,
        'sla_breached_count': sla_breached_count,
        'sla_at_risk_count': sla_at_risk_count,
        'sla_compliance_rate': compliance_rate,
        'critical_incidents_count': critical_incidents_count,
        'avg_resolution_time_hours': round(avg_res_time_hours, 2),
        'avg_agent_utilization': avg_agent_utilization,
        'agent_performances': agent_perf,
        'monthly_trends': monthly_trends,
        'busiest_hours': busiest_hours,
        'busiest_days': busiest_days,
        'csat_average': 4.7
    }), 200

@reports_bp.route('/export', methods=['GET'])
@jwt_required()
def export_csv():
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role not in ['SUPPORT_MANAGER', 'ADMIN']:
        return jsonify({'error': 'Unauthorized to export CSV reports'}), 403
        
    tickets = Ticket.query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'Ticket ID', 'Title', 'Description', 'Category', 'Priority', 'Severity',
        'Status', 'Client Name', 'Client Email', 'Assigned Agent Name', 
        'Created At', 'Updated At', 'Resolved At', 'SLA Deadline', 'SLA Breached'
    ])
    
    for t in tickets:
        writer.writerow([
            t.id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.severity,
            t.status,
            t.client.name if t.client else '',
            t.client.email if t.client else '',
            t.assigned_agent.name if t.assigned_agent else 'Unassigned',
            t.created_at.isoformat(),
            t.updated_at.isoformat(),
            t.resolved_at.isoformat() if t.resolved_at else 'N/A',
            t.sla_deadline.isoformat() if t.sla_deadline else 'N/A',
            t.sla_breached
        ])
        
    output.seek(0)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"stms_tickets_report_{timestamp}.csv"
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )
