import json
import hashlib
from typing import Optional, Any, Dict
from datetime import datetime, timedelta

class Cache:
    def __init__(self):
        self.memory_cache: Dict[str, Dict] = {}
        self.default_ttl_seconds = 900  # 15 minutes
    
    def _make_key(self, path: str, params: dict, provider: str) -> str:
        """Generate cache key from path, sorted params, and provider"""
        sorted_params = json.dumps(params, sort_keys=True)
        key_data = f"{path}:{sorted_params}:{provider}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, path: str, params: dict, provider: str) -> Optional[Any]:
        """Get cached value from memory"""
        key = self._make_key(path, params, provider)
        
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if datetime.now() < entry["expires"]:
                return entry["data"]
            else:
                # Expired, remove from cache
                del self.memory_cache[key]
        
        return None
    
    async def set(self, path: str, params: dict, provider: str, data: Any, ttl_seconds: Optional[int] = None):
        """Set value in memory cache"""
        key = self._make_key(path, params, provider)
        ttl = ttl_seconds or self.default_ttl_seconds
        
        self.memory_cache[key] = {
            "data": data,
            "expires": datetime.now() + timedelta(seconds=ttl)
        }
        
        # Simple memory cache cleanup - remove expired entries when cache gets large
        if len(self.memory_cache) > 1000:
            self._cleanup_expired()
    
    def _cleanup_expired(self):
        """Remove expired entries from memory cache"""
        now = datetime.now()
        expired_keys = [
            k for k, v in self.memory_cache.items() 
            if now >= v["expires"]
        ]
        for k in expired_keys:
            del self.memory_cache[k]
    
    def clear(self):
        """Clear all cached data"""
        self.memory_cache.clear()
    
    def size(self) -> int:
        """Get current cache size"""
        return len(self.memory_cache)

# Global cache instance
cache = Cache()