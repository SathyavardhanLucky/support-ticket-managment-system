from flask import Blueprint, request, jsonify
from models import db, User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')  # CLIENT, SUPPORT_AGENT, TECH_LEAD, SUPPORT_MANAGER, ADMIN

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

    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    additional_claims = {'role': user.role, 'name': user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        'token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200
