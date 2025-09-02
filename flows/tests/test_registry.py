import pytest
from pathlib import Path

from fantasy_ingest.adapters.registry import DatasetRegistry, DatasetConfig


def test_load_datasets_config():
    """Test that datasets.yml loads correctly."""
    
    # Get the config path
    config_path = Path(__file__).parent.parent / 'config' / 'datasets.yml'
    assert config_path.exists(), f"Config file not found: {config_path}"
    
    # Load registry
    registry = DatasetRegistry(config_path)
    
    # Check that datasets were loaded
    assert len(registry.datasets) > 0, "No datasets loaded"
    
    # Check that expected datasets exist
    expected_datasets = [
        'players', 'rosters', 'schedules', 'weekly_player_stats',
        'participation', 'injuries', 'depth_charts'
    ]
    
    for dataset_id in expected_datasets:
        assert dataset_id in registry.datasets, f"Dataset {dataset_id} not found"


def test_dataset_config_properties():
    """Test DatasetConfig properties and methods."""
    
    config_path = Path(__file__).parent.parent / 'config' / 'datasets.yml'
    registry = DatasetRegistry(config_path)
    
    # Test weekly dataset
    weekly_stats = registry.get_dataset('weekly_player_stats')
    assert weekly_stats.is_weekly()
    assert not weekly_stats.is_seasonal()
    assert not weekly_stats.is_snapshot()
    assert weekly_stats.partition_type == 'weekly'
    assert 'season' in weekly_stats.partition_keys
    assert 'week' in weekly_stats.partition_keys
    
    # Test seasonal dataset
    rosters = registry.get_dataset('rosters')
    assert rosters.is_seasonal()
    assert not rosters.is_weekly()
    assert not rosters.is_snapshot()
    assert rosters.partition_type == 'seasonal'
    assert 'season' in rosters.partition_keys
    
    # Test snapshot dataset
    players = registry.get_dataset('players')
    assert players.is_snapshot()
    assert not players.is_weekly()
    assert not players.is_seasonal()
    assert players.partition_type == 'snapshot'
    assert 'snapshot_date' in players.partition_keys


def test_pk_and_required_fields():
    """Test that primary keys and required fields are defined."""
    
    config_path = Path(__file__).parent.parent / 'config' / 'datasets.yml'
    registry = DatasetRegistry(config_path)
    
    for dataset_id in registry.list_datasets():
        dataset_config = registry.get_dataset(dataset_id)
        
        # All datasets should have primary keys defined
        assert len(dataset_config.pk) > 0, f"Dataset {dataset_id} has no primary keys"
        
        # All datasets should have required fields
        assert len(dataset_config.required_fields) > 0, f"Dataset {dataset_id} has no required fields"
        
        # All datasets should have ID columns
        assert len(dataset_config.id_columns) > 0, f"Dataset {dataset_id} has no ID columns"
        
        # Schema version should be set
        assert dataset_config.schema_version, f"Dataset {dataset_id} has no schema version"


def test_dataset_categorization():
    """Test that datasets are correctly categorized by partition type."""
    
    config_path = Path(__file__).parent.parent / 'config' / 'datasets.yml'
    registry = DatasetRegistry(config_path)
    
    weekly_datasets = registry.get_weekly_datasets()
    seasonal_datasets = registry.get_seasonal_datasets()
    snapshot_datasets = registry.get_snapshot_datasets()
    
    # Check counts
    assert len(weekly_datasets) > 0, "No weekly datasets found"
    assert len(seasonal_datasets) > 0, "No seasonal datasets found"
    assert len(snapshot_datasets) > 0, "No snapshot datasets found"
    
    # Check that all datasets are accounted for
    total_datasets = len(weekly_datasets) + len(seasonal_datasets) + len(snapshot_datasets)
    assert total_datasets == len(registry.datasets), "Dataset categorization mismatch"
    
    # Check specific datasets
    weekly_ids = [ds.id for ds in weekly_datasets]
    assert 'weekly_player_stats' in weekly_ids
    assert 'participation' in weekly_ids
    assert 'injuries' in weekly_ids
    assert 'depth_charts' in weekly_ids
    
    seasonal_ids = [ds.id for ds in seasonal_datasets]
    assert 'rosters' in seasonal_ids
    assert 'schedules' in seasonal_ids
    
    snapshot_ids = [ds.id for ds in snapshot_datasets]
    assert 'players' in snapshot_ids


if __name__ == "__main__":
    pytest.main([__file__])