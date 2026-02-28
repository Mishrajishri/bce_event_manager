"""Authentication routes."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.models import (
    AuthResponse,
    LoginRequest,
    UserCreate,
    UserResponse,
    MessageResponse,
)
from app.supabase import supabase, supabase_admin
from app.auth import CurrentUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user.

    Args:
        user_data: User registration data

    Returns:
        AuthResponse: Authentication tokens and user data

    Raises:
        HTTPException: If registration fails
    """
    try:
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "first_name": user_data.first_name,
                        "last_name": user_data.last_name,
                        "role": user_data.role.value,
                        "phone": user_data.phone,
                    }
                },
            }
        )

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please try again."
            )

        # Get the access token
        session = auth_response.session

        if not session:
            # Email confirmation required
            return AuthResponse(
                access_token="",
                refresh_token="",
                token_type="bearer",
                user=UserResponse(
                    id=auth_response.user.id,
                    email=auth_response.user.email or user_data.email,
                    first_name=user_data.first_name,
                    last_name=user_data.last_name,
                    phone=user_data.phone,
                    role=user_data.role,
                    is_verified=False,
                    created_at=auth_response.user.created_at,
                )
            )

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=auth_response.user.id,
                email=auth_response.user.email or "",
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                phone=user_data.phone,
                role=user_data.role,
                is_verified=True,
                created_at=auth_response.user.created_at,
            )
        )

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest):
    """
    Login with email and password.

    Args:
        login_data: User login credentials

    Returns:
        AuthResponse: Authentication tokens and user data

    Raises:
        HTTPException: If login fails
    """
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": login_data.email,
                "password": login_data.password,
            }
        )

        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Get user metadata
        user_metadata = auth_response.user.user_metadata or {}

        return AuthResponse(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=auth_response.user.id,
                email=auth_response.user.email or "",
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                phone=user_metadata.get("phone"),
                role=user_metadata.get("role", "attendee"),
                is_verified=auth_response.user.email_confirmed_at is not None,
                created_at=auth_response.user.created_at,
            )
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """
    Logout current user.

    Args:
        current_user: Current authenticated user

    Returns:
        MessageResponse: Logout success message
    """
    try:
        supabase.auth.sign_out()
        return MessageResponse(message="Successfully logged out")
    except Exception:
        return MessageResponse(message="Successfully logged out")


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.

    Args:
        refresh_token: Refresh token

    Returns:
        AuthResponse: New authentication tokens

    Raises:
        HTTPException: If refresh fails
    """
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)

        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        user_metadata = auth_response.user.user_metadata or {}

        return AuthResponse(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=auth_response.user.id,
                email=auth_response.user.email or "",
                first_name=user_metadata.get("first_name", ""),
                last_name=user_metadata.get("last_name", ""),
                phone=user_metadata.get("phone"),
                role=user_metadata.get("role", "attendee"),
                is_verified=auth_response.user.email_confirmed_at is not None,
                created_at=auth_response.user.created_at,
            )
        )

    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get current user profile with full metadata from Supabase.

    Args:
        current_user: Current authenticated user

    Returns:
        UserResponse: Current user data with complete profile
    """
    try:
        # Fetch full user data from Supabase Admin API
        user_resp = supabase_admin.auth.admin.get_user_by_id(current_user.user_id)
        user = user_resp.user
        meta = user.user_metadata or {}

        return UserResponse(
            id=user.id,
            email=user.email or current_user.email,
            first_name=meta.get("first_name", ""),
            last_name=meta.get("last_name", ""),
            phone=meta.get("phone"),
            role=meta.get("role", current_user.role),
            is_verified=user.email_confirmed_at is not None,
            created_at=user.created_at,
        )
    except Exception as e:
        logger.warning(f"Failed to fetch user metadata: {e}")
        # Fallback to token data if Supabase call fails
        return UserResponse(
            id=current_user.user_id,
            email=current_user.email,
            first_name="",
            last_name="",
            role=current_user.role,
            is_verified=True,
            created_at=None,
        )

