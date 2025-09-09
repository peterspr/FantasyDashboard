from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_meta_endpoint():
    """Test meta endpoint."""
    response = client.get("/v1/meta")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "env" in data
    assert data["service"] == "fantasy-insights-api"
