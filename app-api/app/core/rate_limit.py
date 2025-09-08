import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException

class SimpleRateLimiter:
    def __init__(self):
        # Store: {client_ip: (request_count, window_start_time)}
        self.clients: Dict[str, Tuple[int, float]] = {}
        self.window_size = 60  # 60 seconds
        self.max_requests = 600  # 10 requests per second
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers first (when behind proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    def is_allowed(self, request: Request) -> bool:
        """Check if request is allowed based on rate limit"""
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean up old entries periodically
        if len(self.clients) > 10000:  # Arbitrary cleanup threshold
            self._cleanup_old_entries(current_time)
        
        # Get or initialize client data
        if client_ip not in self.clients:
            self.clients[client_ip] = (1, current_time)
            return True
        
        request_count, window_start = self.clients[client_ip]
        
        # Check if we're still in the same time window
        if current_time - window_start < self.window_size:
            if request_count >= self.max_requests:
                return False
            # Increment request count
            self.clients[client_ip] = (request_count + 1, window_start)
        else:
            # New time window, reset counter
            self.clients[client_ip] = (1, current_time)
        
        return True
    
    def _cleanup_old_entries(self, current_time: float):
        """Remove entries older than the window size"""
        expired_keys = [
            ip for ip, (_, window_start) in self.clients.items()
            if current_time - window_start > self.window_size
        ]
        for key in expired_keys:
            del self.clients[key]

# Global rate limiter instance
rate_limiter = SimpleRateLimiter()

async def init_limiter():
    """Initialize rate limiter (no-op for memory-based limiter)"""
    pass

async def close_limiter():
    """Close rate limiter (no-op for memory-based limiter)"""
    pass

def RateLimiter(times: int = 60, seconds: int = 60):
    """
    Rate limiter dependency for FastAPI routes
    
    Args:
        times: Number of allowed requests
        seconds: Time window in seconds
    
    Returns:
        Dependency function for FastAPI routes
    """
    def dependency(request: Request):
        # Update rate limiter settings for this request
        rate_limiter.max_requests = times
        rate_limiter.window_size = seconds
        
        if not rate_limiter.is_allowed(request):
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {times} per {seconds} seconds",
                    "retry_after": seconds
                }
            )
        return True
    
    return dependency