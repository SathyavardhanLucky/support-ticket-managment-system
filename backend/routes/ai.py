import os
from flask import Blueprint, request, jsonify
from models import db, Ticket, Comment, AILog
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import anthropic

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/assist', methods=['POST'])
@jwt_required()
def assist():
    claims = get_jwt()
    user_role = claims.get('role', 'CLIENT')
    
    if user_role not in ['SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN']:
        return jsonify({'error': 'Insufficient permissions to use AI Assistant'}), 403
        
    data = request.get_json() or {}
    ticket_id = data.get('ticket_id')
    action = data.get('action') # summarize, suggest_resolution, generate_reply, detect_scope_creep, chat
    custom_message = data.get('message')
    internal_notes_input = data.get('internal_notes', '')
    
    if not ticket_id or not action:
        return jsonify({'error': 'Ticket ID and action are required'}), 400
        
    ticket = Ticket.query.get_or_404(ticket_id)
    
    # Get last 3 comments
    comments_query = Comment.query.filter_by(ticket_id=ticket.id).order_by(Comment.created_at.desc()).limit(3).all()
    comments_query.reverse()
    last_3_comments_str = "\n".join([f"- {c.user.name} ({c.user.role}): {c.content}" for c in comments_query])
    
    # Get all comments for scope creep / chat context
    all_comments_query = Comment.query.filter_by(ticket_id=ticket.id).order_by(Comment.created_at.asc()).all()
    recent_comments_str = "\n".join([f"{c.user.name} ({c.user.role}): {c.content}" for c in all_comments_query])
    
    if not internal_notes_input:
        last_internal = Comment.query.filter_by(ticket_id=ticket.id, is_internal=True).order_by(Comment.created_at.desc()).first()
        internal_notes_str = last_internal.content if last_internal else "No recent agent notes."
    else:
        internal_notes_str = internal_notes_input

    if action == 'summarize':
        prompt = f"Summarize this support ticket in 3 bullet points. Title: {ticket.title}. Description: {ticket.description}. Category: {ticket.category}. Priority: {ticket.priority}. Status: {ticket.status}. Comments: {last_3_comments_str or 'None'}"
    elif action == 'suggest_resolution':
        prompt = f"You are a senior IT support engineer. Suggest a step-by-step resolution for this ticket: Title: {ticket.title}. Description: {ticket.description}. Category: {ticket.category}."
    elif action == 'generate_reply':
        prompt = f"Write a professional, empathetic email reply to a client for this ticket: Title: {ticket.title}. Status: {ticket.status}. Agent notes: {internal_notes_str}. Keep it under 100 words."
    elif action == 'detect_scope_creep':
        prompt = f"Original ticket: {ticket.title} - {ticket.description}. New comments: {recent_comments_str or 'None'}. Has the scope of this ticket changed? Identify any scope creep in 2-3 sentences."
    elif action == 'chat':
        if not custom_message:
            return jsonify({'error': 'Custom message is required for chat action'}), 400
        prompt = f"Context - Ticket Title: {ticket.title}, Description: {ticket.description}, Category: {ticket.category}, Priority: {ticket.priority}, Status: {ticket.status}.\nComments:\n{recent_comments_str}\n\nUser Question: {custom_message}"
    else:
        return jsonify({'error': 'Invalid action'}), 400

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_key"):
        # Fallback or mock response if API Key is not set or placeholder
        ai_response = f"[Mock AI Response - Anthropic API Key not set]\n\nBased on your prompt, here is a mock response:\n- Topic: {ticket.title}\n- Category: {ticket.category}\n- Priority: {ticket.priority}\n- Status: {ticket.status}\n\nPrompt details analyzed: {prompt[:150]}..."
    else:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            ai_response = message.content[0].text
        except Exception as e:
            # Fallback if claude-sonnet-4-6 fails (e.g. invalid model name on real API)
            try:
                client = anthropic.Anthropic(api_key=api_key)
                message = client.messages.create(
                    model="claude-3-5-sonnet-latest",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                ai_response = message.content[0].text
            except Exception as inner_e:
                return jsonify({'error': f'AI request failed: {str(inner_e)}'}), 500

    log = AILog(
        ticket_id=ticket.id,
        prompt_sent=prompt,
        ai_response=ai_response
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'action': action,
        'prompt_sent': prompt,
        'ai_response': ai_response,
        'created_at': log.created_at.isoformat()
    }), 200

@ai_bp.route('/suggest-priority', methods=['POST'])
@jwt_required()
def suggest_priority():
    data = request.get_json() or {}
    description = data.get('description', '')
    if not description:
        return jsonify({'error': 'Description is required'}), 400
        
    desc_lower = description.lower()
    suggested = "Low"
    reason = "standard keywords detected"
    
    if any(k in desc_lower for k in ["crash", "down", "outage", "broken", "critical", "security breach", "leak", "hacked"]):
        suggested = "Critical"
        reason = "potential system outage or security leak"
    elif any(k in desc_lower for k in ["urgent", "fail", "error", "blocker", "cannot login", "not working", "payment"]):
        suggested = "High"
        reason = "functional blocker or key feature failure"
    elif any(k in desc_lower for k in ["slow", "bug", "minor", "incorrect", "wrong"]):
        suggested = "Medium"
        reason = "minor performance issue or bug"
        
    return jsonify({
        'suggested_priority': suggested,
        'reason': reason
    }), 200

