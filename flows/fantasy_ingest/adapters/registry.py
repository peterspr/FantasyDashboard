import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from prefect import get_run_logger


@dataclass
class DatasetConfig:
    """Configuration for a dataset."""
    id: str
    description: str
    loader_fn: str
    partitioning: Dict[str, Any]
    pk: List[str]
    required_fields: List[str]
    id_columns: List[str]
    schema_version: str
    rename_map: Optional[Dict[str, str]] = None
    
    @property
    def partition_type(self) -> str:
        """Get partition type (weekly, seasonal, snapshot)."""
        return self.partitioning.get('type', 'snapshot')
    
    @property
    def partition_keys(self) -> List[str]:
        """Get partition keys."""
        return self.partitioning.get('keys', [])
    
    def is_weekly(self) -> bool:
        """Check if dataset is partitioned weekly."""
        return self.partition_type == 'weekly'
    
    def is_seasonal(self) -> bool:
        """Check if dataset is partitioned by season."""
        return self.partition_type == 'seasonal'
    
    def is_snapshot(self) -> bool:
        """Check if dataset is snapshot-based."""
        return self.partition_type == 'snapshot'


class DatasetRegistry:
    """Registry for dataset configurations."""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.logger = get_run_logger()
        
        if config_path is None:
            # Default to config/datasets.yml relative to this file
            config_path = Path(__file__).parent.parent.parent / 'config' / 'datasets.yml'
        
        self.config_path = config_path
        self.datasets: Dict[str, DatasetConfig] = {}
        self._load_config()
    
    def _load_config(self) -> None:
        """Load dataset configurations from YAML."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            for dataset_id, dataset_config in config.get('datasets', {}).items():
                self.datasets[dataset_id] = DatasetConfig(
                    id=dataset_id,
                    description=dataset_config.get('description', ''),
                    loader_fn=dataset_config.get('loader_fn', ''),
                    partitioning=dataset_config.get('partitioning', {}),
                    pk=dataset_config.get('pk', []),
                    required_fields=dataset_config.get('required_fields', []),
                    id_columns=dataset_config.get('id_columns', []),
                    schema_version=dataset_config.get('schema_version', 'v1'),
                    rename_map=dataset_config.get('rename_map')
                )
            
            self.logger.info(f"Loaded {len(self.datasets)} dataset configurations")
            
        except Exception as e:
            self.logger.error(f"Failed to load dataset config: {e}")
            raise
    
    def get_dataset(self, dataset_id: str) -> DatasetConfig:
        """Get dataset configuration by ID."""
        if dataset_id not in self.datasets:
            raise ValueError(f"Unknown dataset: {dataset_id}")
        
        return self.datasets[dataset_id]
    
    def list_datasets(self) -> List[str]:
        """List all dataset IDs."""
        return list(self.datasets.keys())
    
    def get_weekly_datasets(self) -> List[DatasetConfig]:
        """Get all weekly datasets."""
        return [ds for ds in self.datasets.values() if ds.is_weekly()]
    
    def get_seasonal_datasets(self) -> List[DatasetConfig]:
        """Get all seasonal datasets."""
        return [ds for ds in self.datasets.values() if ds.is_seasonal()]
    
    def get_snapshot_datasets(self) -> List[DatasetConfig]:
        """Get all snapshot datasets."""
        return [ds for ds in self.datasets.values() if ds.is_snapshot()]


def get_dataset_registry(config_path: Optional[Path] = None) -> DatasetRegistry:
    """Get dataset registry instance."""
    return DatasetRegistry(config_path)