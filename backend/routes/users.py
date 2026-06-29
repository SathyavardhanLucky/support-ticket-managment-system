from flask import Blueprint, request, jsonify
from models import db, User
from flask_jwt_extended import jwt_required, get_jwt
import re

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@jwt_required()
def list_users():
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role not in ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@users_bp.route('', methods=['POST'])
@jwt_required()
def create_user():
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role != 'ADMIN':
        return jsonify({'error': 'Admin privilege required'}), 403
        
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not name or not email or not password or not role:
        return jsonify({'error': 'Missing required fields'}), 400

    role = role.upper()
    valid_roles = ['CLIENT', 'SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN']
    if role not in valid_roles:
        return jsonify({'error': f'Invalid role. Must be one of {valid_roles}'}), 400

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'error': 'Invalid email format'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201

@users_bp.route('/<int:id>/role', methods=['PATCH'])
@jwt_required()
def update_user_role(id):
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role != 'ADMIN':
        return jsonify({'error': 'Admin privilege required'}), 403
        
    data = request.get_json() or {}
    new_role = data.get('role')
    
    if not new_role:
        return jsonify({'error': 'Role field is required'}), 400
        
    new_role = new_role.upper()
    valid_roles = ['CLIENT', 'SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN']
    if new_role not in valid_roles:
        return jsonify({'error': f'Invalid role. Must be one of {valid_roles}'}), 400
        
    user = User.query.get_or_404(id)
    user.role = new_role
    db.session.commit()
    
    return jsonify(user.to_dict()), 200

@users_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role != 'ADMIN':
        return jsonify({'error': 'Admin privilege required'}), 403
        
    user = User.query.get_or_404(id)
    if user.email == 'admin@crownridge.com':
        return jsonify({'error': 'Cannot delete default admin user'}), 400
        
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'}), 200


# Endpoint to update agent availability status
@users_bp.route('/<int:id>/availability', methods=['PATCH'])
@jwt_required()
def update_user_availability(id):
    data = request.get_json() or {}
    new_avail = data.get('availability')
    
    if not new_avail:
        return jsonify({'error': 'Availability is required'}), 400
        
    new_avail = new_avail.upper()
    valid_states = ['ONLINE', 'OFFLINE', 'BREAK', 'BUSY']
    if new_avail not in valid_states:
        return jsonify({'error': f'Invalid availability. Must be one of {valid_states}'}), 400
        
    user = User.query.get_or_404(id)
    user.availability = new_avail
    db.session.commit()
    
    return jsonify(user.to_dict()), 200

