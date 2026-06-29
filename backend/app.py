import os
import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db, User, Ticket, TicketHistory
from socket_instance import socketio
import socket_events  # ensures socket event handlers are registered
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_jwt_secret_key_123')
app.config['JWT_SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_jwt_secret_key_123')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=7)

# SQLite database setup relative to backend folder
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(basedir, 'stms.db')}")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Initialize Extensions
db.init_app(app)
jwt = JWTManager(app)
socketio.init_app(app)

# Register Blueprints
from routes.auth import auth_bp
from routes.tickets import tickets_bp
from routes.ai import ai_bp
from routes.reports import reports_bp
from routes.users import users_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(users_bp, url_prefix='/api/users')

# SLA Background Breach Monitor Job
def check_sla_breaches():
    with app.app_context():
        now = datetime.datetime.utcnow()
        # Find active tickets that have passed deadline but not Resolved or Closed, and not already flagged
        breached_tickets = Ticket.query.filter(
            Ticket.sla_deadline < now,
            Ticket.sla_breached == False,
            Ticket.status.notin_(['Resolved', 'Closed'])
        ).all()
        
        for ticket in breached_tickets:
            ticket.sla_breached = True
            db.session.add(ticket)
            
            # Log history (using system admin ID = 1)
            system_user = User.query.filter_by(role='ADMIN').first()
            system_user_id = system_user.id if system_user else 1
            
            history = TicketHistory(
                ticket_id=ticket.id,
                changed_by=system_user_id,
                field_changed='sla_breached',
                old_value='False',
                new_value='True'
            )
            db.session.add(history)
            db.session.commit()
            
            # Emit Socket.IO alert
            socketio.emit('sla_breach_alert', ticket.to_dict())
            print(f"[SLA Monitor] Ticket ID {ticket.id} flagged as breached.")

# Configure APScheduler
scheduler = BackgroundScheduler()
# Check every 5 minutes (or 30 seconds for easier local testing/demo if needed, but requirements say 5 minutes)
scheduler.add_job(check_sla_breaches, 'interval', minutes=5)
scheduler.start()

# Auto-migration function to add new columns to SQLite on the fly
def check_and_add_columns():
    users_cols = [c['name'] for c in db.inspect(db.engine).get_columns('users')]
    conn = db.engine.connect()
    
    if 'availability' not in users_cols:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN availability VARCHAR(50) DEFAULT 'ONLINE'"))
    if 'company' not in users_cols:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN company VARCHAR(100) NULL"))
    if 'is_vip' not in users_cols:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN is_vip BOOLEAN DEFAULT 0"))
        
    tickets_cols = [c['name'] for c in db.inspect(db.engine).get_columns('tickets')]
    if 'escalation_level' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN escalation_level INTEGER DEFAULT 0"))
    if 'escalation_reason' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN escalation_reason TEXT NULL"))
    if 'escalated_at' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN escalated_at DATETIME NULL"))
    if 'needs_approval' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN needs_approval BOOLEAN DEFAULT 0"))
    if 'approval_status' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN approval_status VARCHAR(50) NULL"))
    if 'device_info' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN device_info VARCHAR(255) NULL"))
    if 'browser_info' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN browser_info VARCHAR(255) NULL"))
    if 'ip_address' not in tickets_cols:
        conn.execute(db.text("ALTER TABLE tickets ADD COLUMN ip_address VARCHAR(50) NULL"))
        
    db.session.commit()
    conn.close()

# Seed default database accounts
def seed_database():
    with app.app_context():
        db.create_all()
        check_and_add_columns()
        
        # Check if users already exist
        if User.query.first() is not None:
            return
            
        print("Seeding database with default role accounts...")
        
        seeds = [
            {"name": "System Admin", "email": "admin@crownridge.com", "password": "admin123", "role": "ADMIN"},
            {"name": "Support Manager", "email": "manager@crownridge.com", "password": "manager123", "role": "SUPPORT_MANAGER"},
            {"name": "Support Agent", "email": "agent@crownridge.com", "password": "agent123", "role": "SUPPORT_AGENT"},
            {"name": "Client Account", "email": "client@crownridge.com", "password": "client123", "role": "CLIENT"},
        ]


        
        for s in seeds:
            u = User(name=s["name"], email=s["email"], role=s["role"])
            u.set_password(s["password"])
            db.session.add(u)
            
        db.session.commit()
        print("Database seeded successfully.")

seed_database()

@app.route('/')
def home():
    return jsonify({"message": "STMS Backend API is running."})

if __name__ == '__main__':
    # Flask-SocketIO execution
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)

