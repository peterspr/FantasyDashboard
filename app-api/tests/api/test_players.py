import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@patch("app.api.routers.players.players_repo")
@patch("app.core.cache.cache")
def test_list_players_success(mock_cache, mock_repo, client: TestClient):
    """Test successful players list."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_repo.list_players.return_value = {
        "items": [
            {"player_id": "00-0030506", "name": "Justin Jefferson", "team": "MIN", "position": "WR"}
        ],
        "total": 1,
        "limit": 50,
        "offset": 0,
    }

    response = client.get("/v1/players")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 1


@patch("app.api.routers.players.players_repo")
@patch("app.core.cache.cache")
def test_list_players_with_filters(mock_cache, mock_repo, client: TestClient):
    """Test players list with filters."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_repo.list_players.return_value = {"items": [], "total": 0, "limit": 50, "offset": 0}

    response = client.get("/v1/players?position=WR&team=MIN&search=Jefferson")
    assert response.status_code == 200

    mock_repo.list_players.assert_called_once()
    args, kwargs = mock_repo.list_players.call_args
    assert kwargs["position"] == "WR"
    assert kwargs["team"] == "MIN"
    assert kwargs["search"] == "Jefferson"


def test_list_players_invalid_limit(client: TestClient):
    """Test players list with invalid limit."""
    response = client.get("/v1/players?limit=500")
    assert response.status_code == 422  # Validation error


@patch("app.api.routers.players.players_repo")
@patch("app.core.cache.cache")
def test_list_players_cached_response(mock_cache, mock_repo, client: TestClient):
    """Test cached players response."""
    cached_data = {
        "items": [{"player_id": "test", "name": "Test Player", "team": "TEST", "position": "QB"}],
        "total": 1,
        "limit": 50,
        "offset": 0,
    }
    mock_cache.get.return_value = cached_data

    response = client.get("/v1/players")
    assert response.status_code == 200
    assert response.json() == cached_data

    # Repo should not be called when cache hit
    mock_repo.list_players.assert_not_called()
