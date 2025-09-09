"""Authentication service with JWT and OAuth support."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.async_session import get_session
from app.db.models import RefreshToken, User


class UserInfo(BaseModel):
    """User information from OAuth provider."""

    id: str
    email: str
    name: str
    picture: Optional[str] = None


class TokenData(BaseModel):
    """Token payload data."""

    sub: str
    exp: int
    iat: int
    token_type: str = "access"


class AuthTokens(BaseModel):
    """Authentication tokens response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class AuthService:
    """Authentication service for handling JWT tokens and OAuth."""

    def __init__(self):
        self.settings = get_settings()
        self.security = HTTPBearer()

    def create_access_token(self, user_id: str) -> str:
        """Create JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.access_token_expire_minutes
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "token_type": "access",
        }
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm="HS256")

    def create_refresh_token(self) -> str:
        """Create secure refresh token."""
        return secrets.token_urlsafe(64)

    def hash_token(self, token: str) -> str:
        """Hash token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def store_refresh_token(
        self, session: AsyncSession, user_id: UUID, refresh_token: str
    ) -> None:
        """Store refresh token in database."""
        token_hash = self.hash_token(refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.settings.refresh_token_expire_days
        )

        # Clean up old refresh tokens for this user
        from sqlalchemy import delete

        await session.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))

        # Create new refresh token
        db_token = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        session.add(db_token)
        await session.commit()

    async def verify_refresh_token(
        self, session: AsyncSession, refresh_token: str
    ) -> Optional[User]:
        """Verify refresh token and return associated user."""
        token_hash = self.hash_token(refresh_token)

        result = await session.execute(
            select(RefreshToken)
            .join(User)
            .where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            return None

        # Get the associated user
        user_result = await session.execute(select(User).where(User.id == db_token.user_id))
        return user_result.scalar_one_or_none()

    async def delete_refresh_token(self, session: AsyncSession, refresh_token: str) -> bool:
        """Delete a specific refresh token from database."""
        from sqlalchemy import delete

        token_hash = self.hash_token(refresh_token)

        result = await session.execute(
            delete(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        await session.commit()
        return result.rowcount > 0

    def verify_access_token(self, token: str) -> Optional[TokenData]:
        """Verify JWT access token."""
        try:
            payload = jwt.decode(token, self.settings.jwt_secret_key, algorithms=["HS256"])

            # Check token type
            if payload.get("token_type") != "access":
                return None

            return TokenData(**payload)
        except JWTError:
            return None

    async def exchange_google_code(self, code: str, redirect_uri: str) -> Optional[UserInfo]:
        """Exchange Google authorization code for user info."""
        try:
            # Exchange authorization code for access token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": self.settings.google_client_id,
                "client_secret": self.settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }
            
            async with httpx.AsyncClient() as client:
                token_response = await client.post(token_url, data=token_data)
                
            if token_response.status_code != 200:
                return None
                
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            
            if not access_token:
                return None
            
            # Get user info from Google
            user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
            async with httpx.AsyncClient() as client:
                user_response = await client.get(user_info_url)
                
            if user_response.status_code != 200:
                return None
                
            user_data = user_response.json()
            
            return UserInfo(
                id=user_data.get("id"),
                email=user_data.get("email"),
                name=user_data.get("name"),
                picture=user_data.get("picture"),
            )
        except Exception:
            return None

    async def get_or_create_user(
        self, session: AsyncSession, user_info: UserInfo, provider: str = "google"
    ) -> User:
        """Get or create user from OAuth info."""
        # Try to find existing user
        result = await session.execute(
            select(User).where(User.provider == provider, User.provider_id == user_info.id)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update last login and any changed info
            user.last_login_at = datetime.now(timezone.utc)
            user.name = user_info.name
            user.avatar_url = user_info.picture
            await session.commit()
            return user

        # Create new user
        user = User(
            email=user_info.email,
            name=user_info.name,
            avatar_url=user_info.picture,
            provider=provider,
            provider_id=user_info.id,
            last_login_at=datetime.now(timezone.utc),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    async def create_auth_tokens(self, session: AsyncSession, user: User) -> AuthTokens:
        """Create complete authentication token set."""
        access_token = self.create_access_token(str(user.id))
        refresh_token = self.create_refresh_token()

        # Store refresh token
        await self.store_refresh_token(session, user.id, refresh_token)

        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.settings.access_token_expire_minutes * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
            },
        )


    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        session: AsyncSession = Depends(get_session),
    ) -> User:
        """Get current authenticated user from JWT token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        token_data = self.verify_access_token(credentials.credentials)
        if not token_data:
            raise credentials_exception

        # Get user from database
        result = await session.execute(select(User).where(User.id == UUID(token_data.sub)))
        user = result.scalar_one_or_none()

        if not user:
            raise credentials_exception

        return user

    async def get_current_user_optional(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
        session: AsyncSession = Depends(get_session),
    ) -> Optional[User]:
        """Get current user optionally (for endpoints that work with or without auth)."""
        if not credentials:
            return None

        try:
            return await self.get_current_user(credentials, session)
        except HTTPException:
            return None


# Global auth service instance
auth_service = AuthService()
