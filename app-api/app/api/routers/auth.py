"""Authentication API routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import auth_service, AuthTokens
from app.db.async_session import get_session
from app.db.models import User

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleOAuthRequest(BaseModel):
    """Google OAuth callback request."""

    code: str
    redirect_uri: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


class UserProfile(BaseModel):
    """User profile response."""

    id: str
    email: str
    name: str
    avatar_url: str | None


@router.post("/oauth/callback", response_model=AuthTokens)
async def google_oauth_callback(
    request: GoogleOAuthRequest, response: Response, session: AsyncSession = Depends(get_session)
):
    """
    Handle Google OAuth callback with authorization code.

    This endpoint:
    1. Exchanges authorization code for Google access token
    2. Uses Google access token to get user info
    3. Creates or updates the user in our database
    4. Generates access and refresh tokens
    5. Sets refresh token as httpOnly cookie
    6. Returns access token and user info
    """
    # Exchange authorization code for user info
    user_info = await auth_service.exchange_google_code(request.code, request.redirect_uri)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Failed to authenticate with Google"
        )

    # Get or create user
    user = await auth_service.get_or_create_user(session, user_info)

    # Create auth tokens
    tokens = await auth_service.create_auth_tokens(session, user)

    # Set refresh token as httpOnly cookie (more secure)
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=False,  # Set to False for localhost development
        samesite="lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )

    return tokens


@router.post("/refresh", response_model=AuthTokens)
async def refresh_token(
    response: Response,
    refresh_token: str = Cookie(None),
    session: AsyncSession = Depends(get_session),
):
    """
    Refresh access token using refresh token from cookie.

    This endpoint:
    1. Extracts refresh token from httpOnly cookie
    2. Verifies the refresh token
    3. Generates new access and refresh tokens
    4. Updates the refresh token cookie
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found"
        )

    # Verify refresh token and get user
    user = await auth_service.verify_refresh_token(session, refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )

    # Create new auth tokens
    tokens = await auth_service.create_auth_tokens(session, user)

    # Update refresh token cookie with the new token
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=False,  # Set to False for localhost development
        samesite="lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )

    return tokens


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str = Cookie(None),
    session: AsyncSession = Depends(get_session),
):
    """
    Logout user by invalidating refresh token.

    This endpoint:
    1. Removes refresh token from database
    2. Clears refresh token cookie
    """
    if refresh_token:
        # Remove refresh token from database
        await auth_service.delete_refresh_token(session, refresh_token)

    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token", httponly=True, secure=False, samesite="lax")

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(auth_service.get_current_user)):
    """
    Get current authenticated user profile.

    Requires valid JWT access token in Authorization header.
    """
    return UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
    )


