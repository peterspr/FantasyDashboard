import pytest
from fastapi.testclient import TestClient
from app.main import create_app


def test_create_app():
    """Test FastAPI app creation."""
    app = create_app()
    assert app is not None
    assert app.title == "Fantasy Insights API"


def test_app_includes_middleware():
    """Test app includes required middleware."""
    app = create_app()
    
    # Check that middleware is registered
    middleware_types = [type(middleware.cls).__name__ for middleware in app.user_middleware]
    assert 'RequestIdMiddleware' in middleware_types
    assert 'CORSMiddleware' in middleware_types


def test_app_includes_routes():
    """Test app includes required routes."""
    app = create_app()
    client = TestClient(app)
    
    # Test basic routes exist
    response = client.get("/health")
    assert response.status_code == 200
    
    response = client.get("/v1/meta")
    assert response.status_code == 200