import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@patch("app.core.projections_provider.get_provider")
@patch("app.core.cache.cache")
def test_get_ros_projections_success(mock_cache, mock_provider_getter, client: TestClient):
    """Test successful ROS projections."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.ros.return_value = {
        "season": 2024,
        "scoring": "ppr",
        "items": [
            {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "ppr",
                "proj_total": 185.2,
                "low": 142.1,
                "high": 228.3,
                "per_week_json": None,
            }
        ],
        "total": 1,
        "limit": 50,
        "offset": 0,
    }
    mock_provider_getter.return_value = mock_provider

    response = client.get("/v1/ros/2024")
    assert response.status_code == 200
    data = response.json()
    assert data["season"] == 2024
    assert data["scoring"] == "ppr"
    assert len(data["items"]) == 1


@patch("app.core.projections_provider.get_provider")
@patch("app.core.cache.cache")
def test_get_ros_projections_with_filters(mock_cache, mock_provider_getter, client: TestClient):
    """Test ROS projections with filters."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.ros.return_value = {
        "season": 2024,
        "scoring": "standard",
        "items": [],
        "total": 0,
        "limit": 100,
        "offset": 50,
    }
    mock_provider_getter.return_value = mock_provider

    response = client.get("/v1/ros/2024?scoring=standard&position=QB&team=KC&limit=100&offset=50")
    assert response.status_code == 200

    mock_provider.ros.assert_called_once()
    args, kwargs = mock_provider.ros.call_args
    assert kwargs["scoring"] == "standard"
    assert kwargs["position"] == "QB"
    assert kwargs["team"] == "KC"
    assert kwargs["limit"] == 100
    assert kwargs["offset"] == 50


def test_get_ros_projections_invalid_season(client: TestClient):
    """Test ROS projections with invalid season."""
    response = client.get("/v1/ros/2019")
    assert response.status_code == 400
    assert "Season must be between 2020 and 2030" in response.json()["detail"]


def test_get_ros_projections_invalid_scoring(client: TestClient):
    """Test ROS projections with invalid scoring."""
    response = client.get("/v1/ros/2024?scoring=invalid")
    assert response.status_code == 400
    assert "Scoring must be ppr, half_ppr, or standard" in response.json()["detail"]


def test_get_ros_projections_invalid_sort_by(client: TestClient):
    """Test ROS projections with invalid sort_by."""
    response = client.get("/v1/ros/2024?sort_by=invalid")
    assert response.status_code == 400
    assert "Invalid sort_by field" in response.json()["detail"]


@patch("app.core.projections_provider.get_provider")
@patch("app.core.cache.cache")
def test_get_ros_projections_cached_response(mock_cache, mock_provider_getter, client: TestClient):
    """Test cached ROS response."""
    cached_data = {
        "season": 2024,
        "scoring": "ppr",
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0,
    }
    mock_cache.get.return_value = cached_data

    response = client.get("/v1/ros/2024")
    assert response.status_code == 200
    assert response.json() == cached_data

    # Provider should not be called when cache hit
    mock_provider_getter.assert_not_called()
