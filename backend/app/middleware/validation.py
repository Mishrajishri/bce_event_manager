"""Request validation middleware for additional security."""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import re

logger = logging.getLogger(__name__)

# Maximum lengths for various inputs
MAX_STRING_LENGTH = 10000
MAX_QUERY_PARAMS = 50
MAX_HEADERS = 50

# Note: We don't check for XSS patterns in query params here because
    # legitimate URLs may contain patterns like 'script' (e.g., ?url=https://example.com/script)
    # XSS sanitization should be handled at the rendering layer instead.
    # The patterns below are kept for future body content validation if needed.
    # SUSPICIOUS_PATTERNS = [
    #     r"<script",  # XSS attempts
    #     r"javascript:",  # JavaScript injection
    #     r"on\w+\s*=",  # Event handler injection
    #     r"\{\{",  # Template injection
    #     r"\$\{",  # Template injection
    # ]


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware to validate and sanitize incoming requests."""
    
    # Paths that should skip validation entirely
    SKIP_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}
    # Paths that handle larger payloads (file uploads) - skip content-length check
    LARGE_PAYLOAD_PATHS = {"/upload", "/uploads", "/files", "/submissions/upload"}
    
    async def dispatch(self, request: Request, call_next):
        # Skip validation for health checks and docs (handle trailing slashes consistently)
        path = request.url.path.rstrip('/')
        if path in self.SKIP_PATHS:
            return await call_next(request)
        
        # Check if this is a large payload path - skip content-length validation
        is_large_payload = any(request.url.path.startswith(path) for path in self.LARGE_PAYLOAD_PATHS)
        
        # Check for suspicious patterns in query parameters
        for key, value in request.query_params.items():
            if len(value) > MAX_STRING_LENGTH:
                logger.warning(f"Query param too long: {key}")
                raise HTTPException(
                    status_code=status.HTTP_414_URI_TOO_LONG,
                    detail=f"Query parameter '{key}' exceeds maximum length"
                )
            
            # Removed XSS pattern checking from query params
            # Legitimate URLs may contain patterns like 'script', 'javascript:', etc.
            # XSS sanitization is handled at the rendering layer instead.
        
        # Check number of query parameters
        if len(request.query_params) > MAX_QUERY_PARAMS:
            raise HTTPException(
                status_code=status.HTTP_414_URI_TOO_LONG,
                detail="Too many query parameters"
            )
        
        # Check number of headers (excluding standard headers)
        non_standard_headers = [
            h for h in request.headers.keys()
            if h.lower() not in {"host", "content-type", "content-length", "authorization", "accept", "user-agent"}
        ]
        if len(non_standard_headers) > MAX_HEADERS:
            raise HTTPException(
                status_code=status.HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE,
                detail="Too many custom headers"
            )
        
        # Validate Content-Length for POST/PUT/PATCH requests (skip for large payload paths)
        if not is_large_payload:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    length = int(content_length)
                    if length > 10 * 1024 * 1024:  # 10MB limit
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="Request body too large (max 10MB)"
                        )
                except ValueError:
                    logger.warning(f"Invalid content-length header: {content_length}")
        
        response = await call_next(request)
        return response
