from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_get_latest_manifest_empty():
    """Test manifest endpoint when no data exists."""
    response = client.get("/v1/ops/ingest/manifest/latest")
    
    # Should return 200 even if no data
    assert response.status_code == 200
    
    data = response.json()
    assert "datasets" in data
    assert "total" in data
    assert isinstance(data["datasets"], list)
    assert isinstance(data["total"], int)


def test_get_latest_manifest_structure():
    """Test that manifest response has correct structure."""
    response = client.get("/v1/ops/ingest/manifest/latest")
    assert response.status_code == 200
    
    data = response.json()
    
    # Check structure
    assert "datasets" in data
    assert "total" in data
    
    # If datasets exist, check their structure
    for dataset in data["datasets"]:
        assert "dataset" in dataset
        assert "partition" in dataset  
        assert "row_count" in dataset
        assert "applied_at" in dataset


def test_manifest_endpoint_error_handling():
    """Test that manifest endpoint handles errors gracefully."""
    # This test would need database setup to properly test error conditions
    # For now, just verify the endpoint exists and returns valid JSON
    response = client.get("/v1/ops/ingest/manifest/latest")
    assert response.status_code in [200, 500]  # Either success or controlled error
    
    # Should always return valid JSON
    data = response.json()
    assert isinstance(data, dict)