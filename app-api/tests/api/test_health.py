import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_meta_endpoint(client: TestClient):
    """Test meta information endpoint."""
    response = client.get("/v1/meta")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "env" in data
    assert data["service"] == "fantasy-insights-api"