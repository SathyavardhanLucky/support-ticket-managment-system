import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # ADMIN, SUPPORT_MANAGER, TECH_LEAD, SUPPORT_AGENT, CLIENT
    availability = db.Column(db.String(50), default='ONLINE')  # ONLINE, OFFLINE, BREAK, BUSY
    company = db.Column(db.String(100), nullable=True)
    is_vip = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    tickets_created = db.relationship('Ticket', backref='client', foreign_keys='Ticket.client_id', lazy=True)
    tickets_assigned = db.relationship('Ticket', backref='assigned_agent', foreign_keys='Ticket.assigned_agent_id', lazy=True)
    comments = db.relationship('Comment', backref='user', lazy=True)
    history_changes = db.relationship('TicketHistory', backref='changer', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'availability': self.availability if hasattr(self, 'availability') else 'ONLINE',
            'company': self.company if hasattr(self, 'company') else None,
            'is_vip': self.is_vip if hasattr(self, 'is_vip') else False,
            'created_at': self.created_at.isoformat()
        }

class Ticket(db.Model):
    __tablename__ = 'tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # Website, App, Software, Hosting, Bug, Change Request
    priority = db.Column(db.String(50), nullable=False)    # Low, Medium, High, Critical
    severity = db.Column(db.String(50), nullable=False)    # Minor, Major, Critical, Blocker
    status = db.Column(db.String(50), default='Open', nullable=False)  # Open, In Progress, On Hold, Resolved, Closed
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_agent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    sla_deadline = db.Column(db.DateTime, nullable=False)
    sla_breached = db.Column(db.Boolean, default=False, nullable=False)
    
    # Escalation & Approvals
    escalation_level = db.Column(db.Integer, default=0, nullable=True)
    escalation_reason = db.Column(db.Text, nullable=True)
    escalated_at = db.Column(db.DateTime, nullable=True)
    needs_approval = db.Column(db.Boolean, default=False, nullable=True)
    approval_status = db.Column(db.String(50), nullable=True)
    
    # Client Environment Meta
    device_info = db.Column(db.String(255), nullable=True)
    browser_info = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    
    # Relationships
    comments = db.relationship('Comment', backref='ticket', cascade="all, delete-orphan", lazy=True)
    history = db.relationship('TicketHistory', backref='ticket', cascade="all, delete-orphan", lazy=True)
    ai_logs = db.relationship('AILog', backref='ticket', cascade="all, delete-orphan", lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'severity': self.severity,
            'status': self.status,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'client_email': self.client.email if self.client else None,
            'client_is_vip': self.client.is_vip if (self.client and hasattr(self.client, 'is_vip')) else False,
            'assigned_agent_id': self.assigned_agent_id,
            'assigned_agent_name': self.assigned_agent.name if self.assigned_agent else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'sla_deadline': self.sla_deadline.isoformat() if self.sla_deadline else None,
            'sla_breached': self.sla_breached,
            'escalation_level': self.escalation_level if hasattr(self, 'escalation_level') else 0,
            'escalation_reason': self.escalation_reason if hasattr(self, 'escalation_reason') else None,
            'escalated_at': self.escalated_at.isoformat() if (hasattr(self, 'escalated_at') and self.escalated_at) else None,
            'needs_approval': self.needs_approval if hasattr(self, 'needs_approval') else False,
            'approval_status': self.approval_status if hasattr(self, 'approval_status') else None,
            'device_info': self.device_info if hasattr(self, 'device_info') else None,
            'browser_info': self.browser_info if hasattr(self, 'browser_info') else None,
            'ip_address': self.ip_address if hasattr(self, 'ip_address') else None,
            'comments': [c.to_dict() for c in self.comments] if self.comments else [],
            'history': [h.to_dict() for h in self.history] if self.history else []
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_role': self.user.role if self.user else None,
            'content': self.content,
            'is_internal': self.is_internal,
            'created_at': self.created_at.isoformat()
        }

class TicketHistory(db.Model):
    __tablename__ = 'ticket_history'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    field_changed = db.Column(db.String(100), nullable=False)
    old_value = db.Column(db.String(255), nullable=True)
    new_value = db.Column(db.String(255), nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'changed_by': self.changed_by,
            'changer_name': self.changer.name if self.changer else None,
            'field_changed': self.field_changed,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'changed_at': self.changed_at.isoformat()
        }

class AILog(db.Model):
    __tablename__ = 'ai_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    prompt_sent = db.Column(db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'prompt_sent': self.prompt_sent,
            'ai_response': self.ai_response,
            'created_at': self.created_at.isoformat()
        }
