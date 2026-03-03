"""Authentication dependencies for FastAPI."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.supabase import supabase
from typing import Optional


security = HTTPBearer()


class CurrentUser:
    """Current authenticated user context."""

    def __init__(self, user_id: str, email: str, role: str = "attendee"):
        self.user_id = user_id
        self.email = email
        self.role = role


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    Validate JWT token from Supabase and return current user.

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        CurrentUser: Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    try:
        # Verify the JWT token with Supabase
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user

        # Get user role from user metadata or custom claims
        role = user.user_metadata.get("role", "attendee") if user.user_metadata else "attendee"

        return CurrentUser(
            user_id=user.id,
            email=user.email or "",
            role=role
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[CurrentUser]:
    """
    Get current user if authenticated, otherwise return None.

    Args:
        credentials: Optional bearer token

    Returns:
        CurrentUser or None
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(allowed_roles: list[str]):
    """
    Dependency factory for role-based access control.

    Args:
        allowed_roles: List of roles that are allowed to access the endpoint

    Returns:
        Dependency function that checks user role
    """
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


# Pre-defined role checkers
require_super_admin = require_role(["super_admin"])
require_organizer = require_role(["super_admin", "organizer"])
require_admin = require_organizer  # Alias — same permissions as organizer
require_captain = require_role(["super_admin", "organizer", "captain"])
require_any_user = require_role(["super_admin", "organizer", "captain", "attendee"])
