from flask import Blueprint, request, jsonify
from models import db, User, Ticket, Comment, TicketHistory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from socket_instance import socketio
import datetime

tickets_bp = Blueprint('tickets', __name__)

def detect_priority(title, description):
    text = f"{title} {description}".lower()
    critical_keywords = ["down", "crash", "not loading", "data loss"]
    high_keywords = ["slow", "error", "bug", "broken"]
    medium_keywords = ["change", "update", "request", "feature"]
    
    if any(k in text for k in critical_keywords):
        return "Critical"
    elif any(k in text for k in high_keywords):
        return "High"
    elif any(k in text for k in medium_keywords):
        return "Medium"
    else:
        return "Low"

def calculate_sla_deadline(priority, start_time=None):
    if not start_time:
        start_time = datetime.datetime.utcnow()
        
    if priority == 'Critical':
        return start_time + datetime.timedelta(hours=4)
    elif priority == 'High':
        return start_time + datetime.timedelta(hours=8)
    elif priority == 'Medium':
        return start_time + datetime.timedelta(hours=24)
    else:
        return start_time + datetime.timedelta(hours=72)

def perform_auto_assignment():
    # Find all agents
    agents = User.query.filter_by(role='SUPPORT_AGENT').all()
    if not agents:
        # Assign to Support Manager
        manager = User.query.filter_by(role='SUPPORT_MANAGER').first()
        return manager.id if manager else None
    
    # Count open tickets for each agent
    # Open statuses are Open, In Progress, On Hold
    agent_loads = []
    for agent in agents:
        open_count = Ticket.query.filter(
            Ticket.assigned_agent_id == agent.id,
            Ticket.status.notin_(['Resolved', 'Closed'])
        ).count()
        agent_loads.append((agent.id, open_count))
        
    # Sort by load (ascending)
    agent_loads.sort(key=lambda x: x[1])
    return agent_loads[0][0]

def log_ticket_change(ticket_id, changed_by, field, old_val, new_val):
    if old_val == new_val:
        return
    history = TicketHistory(
        ticket_id=ticket_id,
        changed_by=changed_by,
        field_changed=field,
        old_value=str(old_val) if old_val is not None else "",
        new_value=str(new_val) if new_val is not None else ""
    )
    db.session.add(history)

def verify_ticket_access(ticket, user_role, user_id):
    if user_role == 'ADMIN' or user_role == 'SUPPORT_MANAGER':
        return True
    if user_role == 'CLIENT':
        return ticket.client_id == user_id
    if user_role == 'SUPPORT_AGENT':
        return ticket.assigned_agent_id == user_id
    if user_role == 'TECH_LEAD':
        return ticket.category in ['Bug', 'Change Request']
    return False

@tickets_bp.route('', methods=['POST'])
@jwt_required()
def create_ticket():
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description')
    category = data.get('category')
    severity = data.get('severity', 'Minor') # Minor, Major, Critical, Blocker
    
    if not title or not description or not category:
        return jsonify({'error': 'Title, description, and category are required'}), 400
        
    # Validations
    categories = ['Website', 'App', 'Software', 'Hosting', 'Bug', 'Change Request']
    severities = ['Minor', 'Major', 'Critical', 'Blocker']
    if category not in categories:
        return jsonify({'error': f'Category must be one of {categories}'}), 400
    if severity not in severities:
        return jsonify({'error': f'Severity must be one of {severities}'}), 400

    # Rule 1: Auto-priority
    priority = detect_priority(title, description)
    
    # Rule 2: SLA deadline
    created_now = datetime.datetime.utcnow()
    sla_deadline = calculate_sla_deadline(priority, created_now)
    
    # Rule 4: Auto-assignment
    assigned_agent_id = perform_auto_assignment()
    
    ticket = Ticket(
        title=title,
        description=description,
        category=category,
        priority=priority,
        severity=severity,
        status='Open',
        client_id=current_user_id,
        assigned_agent_id=assigned_agent_id,
        created_at=created_now,
        updated_at=created_now,
        sla_deadline=sla_deadline,
        sla_breached=False
    )
    
    db.session.add(ticket)
    db.session.commit()
    
    # Log creation to history
    log_ticket_change(ticket.id, current_user_id, 'status', None, 'Open')
    if assigned_agent_id:
        log_ticket_change(ticket.id, current_user_id, 'assigned_agent_id', None, assigned_agent_id)
    db.session.commit()
    
    ticket_dict = ticket.to_dict()
    
    # Socket emissions
    socketio.emit('ticket_created', ticket_dict)
    if assigned_agent_id:
        socketio.emit('ticket_assigned', {'ticket_id': ticket.id, 'assigned_agent_id': assigned_agent_id, 'ticket': ticket_dict})
        
    return jsonify(ticket_dict), 201

@tickets_bp.route('', methods=['GET'])
@jwt_required()
def list_tickets():
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    query = Ticket.query
    
    # Apply Role-Based Visibility Limits
    if user_role == 'CLIENT':
        query = query.filter(Ticket.client_id == current_user_id)
    elif user_role == 'SUPPORT_AGENT':
        # Default to assigned, but allow filter overrides. However, to satisfy prompt "View all assigned tickets" strictly:
        query = query.filter(Ticket.assigned_agent_id == current_user_id)
    elif user_role == 'TECH_LEAD':
        # View tickets tagged as Bug or Change Request
        query = query.filter(Ticket.category.in_(['Bug', 'Change Request']))
    
    # Filters from query params
    status = request.args.get('status')
    priority = request.args.get('priority')
    category = request.args.get('category')
    severity = request.args.get('severity')
    agent_id = request.args.get('agent_id')
    
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if severity:
        query = query.filter(Ticket.severity == severity)
    if agent_id:
        query = query.filter(Ticket.assigned_agent_id == int(agent_id))
        
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tickets]), 200

@tickets_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_ticket(id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    ticket = Ticket.query.get_or_404(id)
    
    if not verify_ticket_access(ticket, user_role, current_user_id):
        return jsonify({'error': 'Access Denied'}), 403
        
    return jsonify(ticket.to_dict()), 200

@tickets_bp.route('/<int:id>', methods=['PATCH'])
@jwt_required()
def update_ticket(id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    ticket = Ticket.query.get_or_404(id)
    
    if not verify_ticket_access(ticket, user_role, current_user_id):
        return jsonify({'error': 'Access Denied'}), 403
        
    data = request.get_json() or {}
    status = data.get('status')
    priority = data.get('priority')
    severity = data.get('severity')
    assigned_agent_id = data.get('assigned_agent_id')
    
    # Role checks for field edits
    if user_role == 'CLIENT':
        return jsonify({'error': 'Clients cannot update ticket properties'}), 403
        
    if user_role == 'SUPPORT_AGENT':
        # Can only update status
        if priority or severity or assigned_agent_id:
            return jsonify({'error': 'Agents can only update ticket status'}), 403
            
    if user_role == 'TECH_LEAD':
        # Can update priority, severity, and assigned_agent_id
        if status:
            return jsonify({'error': 'Tech Leads cannot update ticket status'}), 403

    # Apply changes & record history
    changes_made = False
    
    if status and status != ticket.status:
        valid_statuses = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed']
        if status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of {valid_statuses}'}), 400
        log_ticket_change(ticket.id, current_user_id, 'status', ticket.status, status)
        ticket.status = status
        changes_made = True
        
        # Set resolved_at if resolved or closed
        if status in ['Resolved', 'Closed']:
            ticket.resolved_at = datetime.datetime.utcnow()
        else:
            ticket.resolved_at = None
            
    if priority and priority != ticket.priority:
        valid_priorities = ['Low', 'Medium', 'High', 'Critical']
        if priority not in valid_priorities:
            return jsonify({'error': f'Invalid priority. Must be one of {valid_priorities}'}), 400
        log_ticket_change(ticket.id, current_user_id, 'priority', ticket.priority, priority)
        ticket.priority = priority
        # Recalculate SLA deadline based on new priority
        ticket.sla_deadline = calculate_sla_deadline(priority, ticket.created_at)
        changes_made = True
        
    if severity and severity != ticket.severity:
        valid_severities = ['Minor', 'Major', 'Critical', 'Blocker']
        if severity not in valid_severities:
            return jsonify({'error': f'Invalid severity. Must be one of {valid_severities}'}), 400
        log_ticket_change(ticket.id, current_user_id, 'severity', ticket.severity, severity)
        ticket.severity = severity
        changes_made = True
        
    if assigned_agent_id is not None:
        agent_id_val = int(assigned_agent_id) if assigned_agent_id != "" else None
        if agent_id_val != ticket.assigned_agent_id:
            if agent_id_val:
                agent_user = User.query.get(agent_id_val)
                if not agent_user or agent_user.role not in ['SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN']:
                    return jsonify({'error': 'Invalid agent selection'}), 400
            log_ticket_change(ticket.id, current_user_id, 'assigned_agent_id', ticket.assigned_agent_id, agent_id_val)
            ticket.assigned_agent_id = agent_id_val
            changes_made = True
            
            # Emit ticket assigned event
            socketio.emit('ticket_assigned', {
                'ticket_id': ticket.id,
                'assigned_agent_id': agent_id_val,
                'ticket': ticket.to_dict()
            })
            
    if changes_made:
        ticket.updated_at = datetime.datetime.utcnow()
        db.session.commit()
        ticket_dict = ticket.to_dict()
        socketio.emit('ticket_updated', ticket_dict)
        return jsonify(ticket_dict), 200
        
    return jsonify(ticket.to_dict()), 200

@tickets_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(id):
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role != 'ADMIN':
        return jsonify({'error': 'Admin privilege required'}), 403
        
    ticket = Ticket.query.get_or_404(id)
    db.session.delete(ticket)
    db.session.commit()
    
    # Emit update event so UI updates
    socketio.emit('ticket_updated', {'id': id, 'deleted': True})
    return jsonify({'message': 'Ticket deleted successfully'}), 200

# Comment Routes
@tickets_bp.route('/<int:ticket_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(ticket_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    ticket = Ticket.query.get_or_404(ticket_id)
    if not verify_ticket_access(ticket, user_role, current_user_id):
        return jsonify({'error': 'Access Denied'}), 403
        
    query = Comment.query.filter_by(ticket_id=ticket_id)
    
    # Clients cannot see internal comments
    if user_role == 'CLIENT':
        query = query.filter_by(is_internal=False)
        
    comments = query.order_by(Comment.created_at.asc()).all()
    return jsonify([c.to_dict() for c in comments]), 200

@tickets_bp.route('/<int:ticket_id>/comments', methods=['POST'])
@jwt_required()
def post_comment(ticket_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    ticket = Ticket.query.get_or_404(ticket_id)
    if not verify_ticket_access(ticket, user_role, current_user_id):
        return jsonify({'error': 'Access Denied'}), 403
        
    data = request.get_json() or {}
    content = data.get('content')
    is_internal = data.get('is_internal', False)
    
    if not content:
        return jsonify({'error': 'Comment content is required'}), 400
        
    # Client cannot make internal comments
    if user_role == 'CLIENT':
        is_internal = False
        
    comment = Comment(
        ticket_id=ticket_id,
        user_id=current_user_id,
        content=content,
        is_internal=is_internal
    )
    
    db.session.add(comment)
    db.session.commit()
    
    comment_dict = comment.to_dict()
    
    # Realtime notification
    socketio.emit('comment_added', comment_dict)
    
    return jsonify(comment_dict), 201

# Endpoint to get history for a ticket
@tickets_bp.route('/<int:ticket_id>/history', methods=['GET'])
@jwt_required()
def get_history(ticket_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    ticket = Ticket.query.get_or_404(ticket_id)
    if not verify_ticket_access(ticket, user_role, current_user_id):
        return jsonify({'error': 'Access Denied'}), 403
        
    history = TicketHistory.query.filter_by(ticket_id=ticket_id).order_by(TicketHistory.changed_at.asc()).all()
    return jsonify([h.to_dict() for h in history]), 200


# Endpoint to request manager approval
@tickets_bp.route('/<int:id>/request-approval', methods=['POST'])
@jwt_required()
def request_approval(id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role == 'CLIENT':
        return jsonify({'error': 'Unauthorized'}), 403
        
    ticket = Ticket.query.get_or_404(id)
    ticket.needs_approval = True
    ticket.approval_status = 'Pending'
    
    log_ticket_change(ticket.id, current_user_id, 'needs_approval', 'False', 'True')
    db.session.commit()
    
    ticket_dict = ticket.to_dict()
    socketio.emit('ticket_updated', ticket_dict)
    return jsonify(ticket_dict), 200


# Endpoint to process manager approval
@tickets_bp.route('/<int:id>/approval', methods=['POST'])
@jwt_required()
def process_approval(id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role not in ['ADMIN', 'SUPPORT_MANAGER']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    ticket = Ticket.query.get_or_404(id)
    data = request.get_json() or {}
    action = data.get('action') # Approve, Reject
    
    if action not in ['Approve', 'Reject']:
        return jsonify({'error': 'Invalid action'}), 400
        
    ticket.needs_approval = False
    ticket.approval_status = 'Approved' if action == 'Approve' else 'Rejected'
    
    log_ticket_change(ticket.id, current_user_id, 'approval_status', 'Pending', ticket.approval_status)
    db.session.commit()
    
    ticket_dict = ticket.to_dict()
    socketio.emit('ticket_updated', ticket_dict)
    return jsonify(ticket_dict), 200


# Endpoint to escalate a ticket
@tickets_bp.route('/<int:id>/escalate', methods=['POST'])
@jwt_required()
def escalate_ticket(id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role == 'CLIENT':
        return jsonify({'error': 'Unauthorized'}), 403
        
    ticket = Ticket.query.get_or_404(id)
    data = request.get_json() or {}
    level = data.get('level', 1) # 1, 2, 3
    reason = data.get('reason', 'Operations escalation')
    
    ticket.escalation_level = int(level)
    ticket.escalation_reason = reason
    ticket.escalated_at = datetime.datetime.utcnow()
    
    # Adjust SLA deadline to be shorter when escalated (e.g. 30 minutes from now)
    ticket.sla_deadline = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
    
    log_ticket_change(ticket.id, current_user_id, 'escalation_level', '0', str(level))
    db.session.commit()
    
    ticket_dict = ticket.to_dict()
    socketio.emit('ticket_updated', ticket_dict)
    return jsonify(ticket_dict), 200

