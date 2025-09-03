import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@patch('app.api.routers.usage.usage_repo')
@patch('app.core.cache.cache')
def test_get_player_usage_success(mock_cache, mock_repo, client: TestClient):
    """Test successful player usage retrieval."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()
    
    mock_repo.get_player_usage.return_value = {
        "season": 2024,
        "player_id": "00-0030506",
        "items": [
            {
                "season": 2024,
                "week": 10,
                "player_id": "00-0030506",
                "team": "MIN",
                "position": "WR",
                "snap_pct": 0.89,
                "route_pct": 0.92,
                "target_share": 0.28,
                "rush_share": 0.0,
                "routes": 34,
                "targets": 9,
                "rush_att": 0,
                "proj": 18.5,
                "low": 12.3,
                "high": 24.7
            }
        ],
        "total": 1
    }
    
    response = client.get("/v1/usage/2024/00-0030506")
    assert response.status_code == 200
    data = response.json()
    assert data["season"] == 2024
    assert data["player_id"] == "00-0030506"
    assert len(data["items"]) == 1


@patch('app.api.routers.usage.usage_repo')
@patch('app.core.cache.cache')
def test_get_player_usage_with_weeks(mock_cache, mock_repo, client: TestClient):
    """Test player usage with specific weeks."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()
    
    mock_repo.get_player_usage.return_value = {
        "season": 2024,
        "player_id": "00-0030506",
        "items": [],
        "total": 0
    }
    
    response = client.get("/v1/usage/2024/00-0030506?weeks=1,2,3")
    assert response.status_code == 200
    
    mock_repo.get_player_usage.assert_called_once()
    args, kwargs = mock_repo.get_player_usage.call_args
    assert kwargs["season"] == 2024
    assert kwargs["player_id"] == "00-0030506"
    assert kwargs["weeks"] == [1, 2, 3]


@patch('app.api.routers.usage.usage_repo')
@patch('app.core.cache.cache')
def test_get_player_usage_with_week_range(mock_cache, mock_repo, client: TestClient):
    """Test player usage with week range."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()
    
    mock_repo.get_player_usage.return_value = {
        "season": 2024,
        "player_id": "00-0030506",
        "items": [],
        "total": 0
    }
    
    response = client.get("/v1/usage/2024/00-0030506?weeks=1-4")
    assert response.status_code == 200
    
    mock_repo.get_player_usage.assert_called_once()
    args, kwargs = mock_repo.get_player_usage.call_args
    assert kwargs["weeks"] == [1, 2, 3, 4]


def test_get_player_usage_invalid_season(client: TestClient):
    """Test player usage with invalid season."""
    response = client.get("/v1/usage/2019/00-0030506")
    assert response.status_code == 400
    assert "Season must be between 2020 and 2030" in response.json()["detail"]


def test_get_player_usage_invalid_weeks_format(client: TestClient):
    """Test player usage with invalid weeks format."""
    response = client.get("/v1/usage/2024/00-0030506?weeks=invalid")
    assert response.status_code == 400
    assert "Invalid weeks format" in response.json()["detail"]


def test_get_player_usage_invalid_week_values(client: TestClient):
    """Test player usage with invalid week values."""
    response = client.get("/v1/usage/2024/00-0030506?weeks=0,19,20")
    assert response.status_code == 400
    assert "Weeks must be between 1 and 18" in response.json()["detail"]


@patch('app.api.routers.usage.usage_repo')
@patch('app.core.cache.cache')
def test_get_player_usage_not_found(mock_cache, mock_repo, client: TestClient):
    """Test player usage not found."""
    mock_cache.get.return_value = None
    mock_repo.get_player_usage.return_value = {
        "season": 2024,
        "player_id": "invalid-id",
        "items": [],
        "total": 0
    }
    
    response = client.get("/v1/usage/2024/invalid-id")
    assert response.status_code == 404
    assert "Player usage data not found" in response.json()["detail"]