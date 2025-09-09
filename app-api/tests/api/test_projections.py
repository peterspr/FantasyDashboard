import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@patch("app.core.projections_provider.get_provider")
@patch("app.core.cache.cache")
def test_get_weekly_projections_success(mock_cache, mock_provider_getter, client: TestClient):
    """Test successful weekly projections."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.weekly.return_value = {
        "season": 2024,
        "week": 10,
        "scoring": "ppr",
        "items": [
            {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "ppr",
                "proj": 18.5,
                "low": 12.3,
                "high": 24.7,
                "components": {"targets_pred": 9.2},
                "season": 2024,
                "week": 10,
            }
        ],
        "total": 1,
        "limit": 50,
        "offset": 0,
    }
    mock_provider_getter.return_value = mock_provider

    response = client.get("/v1/projections/2024/10")
    assert response.status_code == 200
    data = response.json()
    assert data["season"] == 2024
    assert data["week"] == 10
    assert len(data["items"]) == 1


@patch("app.core.projections_provider.get_provider")
@patch("app.core.cache.cache")
def test_get_weekly_projections_with_filters(mock_cache, mock_provider_getter, client: TestClient):
    """Test weekly projections with filters."""
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.weekly.return_value = {
        "season": 2024,
        "week": 10,
        "scoring": "half_ppr",
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0,
    }
    mock_provider_getter.return_value = mock_provider

    response = client.get(
        "/v1/projections/2024/10?scoring=half_ppr&position=RB&sort_by=high&sort_desc=false"
    )
    assert response.status_code == 200

    mock_provider.weekly.assert_called_once()
    args, kwargs = mock_provider.weekly.call_args
    assert kwargs["scoring"] == "half_ppr"
    assert kwargs["position"] == "RB"
    assert kwargs["sort_by"] == "high"
    assert kwargs["sort_desc"] == False


def test_get_weekly_projections_invalid_season(client: TestClient):
    """Test projections with invalid season."""
    response = client.get("/v1/projections/2019/10")
    assert response.status_code == 400
    assert "Season must be between 2020 and 2030" in response.json()["detail"]


def test_get_weekly_projections_invalid_week(client: TestClient):
    """Test projections with invalid week."""
    response = client.get("/v1/projections/2024/19")
    assert response.status_code == 400
    assert "Week must be between 1 and 18" in response.json()["detail"]


def test_get_weekly_projections_invalid_scoring(client: TestClient):
    """Test projections with invalid scoring."""
    response = client.get("/v1/projections/2024/10?scoring=invalid")
    assert response.status_code == 400
    assert "Scoring must be ppr, half_ppr, or standard" in response.json()["detail"]


def test_get_weekly_projections_invalid_sort_by(client: TestClient):
    """Test projections with invalid sort_by."""
    response = client.get("/v1/projections/2024/10?sort_by=invalid")
    assert response.status_code == 400
    assert "Invalid sort_by field" in response.json()["detail"]
