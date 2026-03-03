
import socketio
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Create a Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.cors_origins_list,
    logger=True,
    engineio_logger=True
)

class ConnectionManager:
    """Manages WebSocket connections and room-based broadcasting."""
    
    @staticmethod
    @sio.event
    async def connect(sid, environ, auth):
        """Handle new connection."""
        logger.info(f"Socket connected: {sid}")
        token = auth.get('token') if auth else None
        if not token:
            logger.warning(f"Connection rejected for {sid}: No auth token")
            return False
            
        try:
            from app.supabase import supabase
            user_response = supabase.auth.get_user(token)
            if not user_response.user:
                return False
            
            await sio.save_session(sid, {'user_id': user_response.user.id})
            return True
        except Exception as e:
            logger.error(f"Socket auth failed: {str(e)}")
            return False
    

    @staticmethod
    @sio.event
    async def disconnect(sid):
        """Handle disconnection."""
        logger.info(f"Socket disconnected: {sid}")

    @staticmethod
    @sio.event
    async def join_match(sid, data):
        """User joins a specific match room for live updates."""
        match_id = data.get("match_id")
        if match_id:
            await sio.enter_room(sid, match_id)
            logger.info(f"SID {sid} joined match room: {match_id}")
            await sio.emit("room_joined", {"room": match_id}, to=sid)

    @staticmethod
    @sio.event
    async def leave_match(sid, data):
        """User leaves a match room."""
        match_id = data.get("match_id")
        if match_id:
            await sio.leave_room(sid, match_id)
            logger.info(f"SID {sid} left match room: {match_id}")

async def broadcast_score_update(match_id: str, score_data: dict):
    """Broadcast score updates to all clients in the match room."""
    await sio.emit("score_updated", score_data, room=match_id)

async def broadcast_commentary(match_id: str, commentary: dict):
    """Broadcast new commentary to all clients in the match room."""
    await sio.emit("new_commentary", commentary, room=match_id)

# Initialize the manager (attaches events)
manager = ConnectionManager()
