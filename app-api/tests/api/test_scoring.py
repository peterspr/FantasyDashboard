import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@patch('app.api.routers.scoring.scoring_repo')
@patch('app.core.cache.cache')
def test_preview_custom_scoring_success(mock_cache, mock_repo, client: TestClient):
    """Test successful custom scoring preview."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()
    
    mock_repo.preview_scoring.return_value = {
        "season": 2024,
        "week": 10,
        "scoring": "custom",
        "items": [
            {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "custom",
                "proj": 20.5,
                "low": 15.4,
                "high": 25.6,
                "components": {"targets_pred": 9.2},
                "season": 2024,
                "week": 10
            }
        ],
        "total": 1,
        "limit": 200,
        "offset": 0
    }
    
    scoring_request = {
        "season": 2024,
        "week": 10,
        "scoring": {
            "reception": 1.0,
            "rec_yd": 0.1,
            "rec_td": 6.0,
            "rush_yd": 0.1,
            "rush_td": 6.0
        },
        "filters": {
            "position": "WR"
        },
        "limit": 200,
        "offset": 0
    }
    
    response = client.post("/v1/scoring/preview", json=scoring_request)
    assert response.status_code == 200
    data = response.json()
    assert data["season"] == 2024
    assert data["week"] == 10
    assert len(data["items"]) == 1


@patch('app.api.routers.scoring.scoring_repo')
@patch('app.core.cache.cache')
def test_preview_custom_scoring_with_filters(mock_cache, mock_repo, client: TestClient):
    """Test custom scoring with filters."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()
    
    mock_repo.preview_scoring.return_value = {
        "season": 2024,
        "week": 10,
        "scoring": "custom",
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0
    }
    
    scoring_request = {
        "season": 2024,
        "week": 10,
        "scoring": {
            "reception": 0.5,
            "rec_td": 6.0
        },
        "filters": {
            "position": "RB",
            "team": "KC",
            "search": "Hunt"
        },
        "limit": 50,
        "offset": 0
    }
    
    response = client.post("/v1/scoring/preview", json=scoring_request)
    assert response.status_code == 200
    
    mock_repo.preview_scoring.assert_called_once()
    args, kwargs = mock_repo.preview_scoring.call_args
    assert kwargs["season"] == 2024
    assert kwargs["week"] == 10
    assert kwargs["scoring"]["reception"] == 0.5
    assert kwargs["filters"]["position"] == "RB"
    assert kwargs["filters"]["team"] == "KC"
    assert kwargs["filters"]["search"] == "Hunt"


def test_preview_custom_scoring_invalid_request(client: TestClient):
    """Test custom scoring with invalid request."""
    invalid_request = {
        "season": "invalid",
        "week": 10,
        "scoring": {}
    }
    
    response = client.post("/v1/scoring/preview", json=invalid_request)
    assert response.status_code == 422  # Validation error


def test_get_scoring_presets_success(client: TestClient):
    """Test getting scoring presets."""
    response = client.get("/v1/scoring/presets")
    assert response.status_code == 200
    data = response.json()
    
    assert "presets" in data
    presets = data["presets"]
    
    assert "ppr" in presets
    assert "half_ppr" in presets
    assert "standard" in presets
    assert "super_flex" in presets
    
    # Check PPR preset structure
    ppr = presets["ppr"]
    assert ppr["reception"] == 1.0
    assert ppr["rec_yd"] == 0.1
    assert ppr["rec_td"] == 6.0
    
    # Check half PPR preset
    half_ppr = presets["half_ppr"]
    assert half_ppr["reception"] == 0.5
    
    # Check standard preset
    standard = presets["standard"]
    assert standard["reception"] == 0.0


def test_get_scoring_presets_cache_headers(client: TestClient):
    """Test scoring presets cache headers."""
    response = client.get("/v1/scoring/presets")
    assert response.status_code == 200
    
    # Should have cache headers for long-term caching
    cache_control = response.headers.get("cache-control")
    assert cache_control is not None
    assert "max-age=3600" in cache_control
    assert "s-maxage=7200" in cache_control


@patch('app.api.routers.scoring.scoring_repo')
@patch('app.core.cache.cache')
def test_preview_custom_scoring_cached_response(mock_cache, mock_repo, client: TestClient):
    """Test cached custom scoring response."""
    cached_data = {
        "season": 2024,
        "week": 10,
        "scoring": "custom",
        "items": [],
        "total": 0,
        "limit": 200,
        "offset": 0
    }
    mock_cache.get.return_value = cached_data
    
    scoring_request = {
        "season": 2024,
        "week": 10,
        "scoring": {"reception": 1.0},
        "filters": {},
        "limit": 200,
        "offset": 0
    }
    
    response = client.post("/v1/scoring/preview", json=scoring_request)
    assert response.status_code == 200
    assert response.json() == cached_data
    
    # Repo should not be called when cache hit
    mock_repo.preview_scoring.assert_not_called()