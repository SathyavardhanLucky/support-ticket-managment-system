from socket_instance import socketio
from flask import request

@socketio.on('connect')
def handle_connect():
    print("Socket client connected:", request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print("Socket client disconnected:", request.sid)
