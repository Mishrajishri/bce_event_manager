#!/bin/bash
# Production start script for Render/Railway
# Run from the backend directory

# Install dependencies if needed (most platforms do this automatically)
# pip install -r requirements.txt

# Run migrations (if any) or setup scripts
# python setup_db.py

# Start the application with Uvicorn
# We use uvicorn with gunicorn workers OR just uvicorn for simple cases
# For WebSockets (Socket.io), a single worker is often easier to manage 
# unless you have a Redis/pub-sub adapter.
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
