from typing import Dict, Any, List

from prefect import flow, get_run_logger

from fantasy_ingest.postgres import get_postgres_client


@flow(name="list_status")
def list_status() -> Dict[str, Any]:
    """List the latest ingest manifest status for all datasets."""
    
    logger = get_run_logger()
    
    try:
        # Get Postgres client
        postgres_client = get_postgres_client()
        
        # Fetch latest manifest records
        manifest_records = postgres_client.get_latest_manifest()
        
        if not manifest_records:
            logger.info("No manifest records found")
            return {'datasets': [], 'total': 0}
        
        logger.info(f"Found {len(manifest_records)} dataset manifest records:")
        logger.info("-" * 80)
        
        for record in manifest_records:
            dataset = record['dataset']
            partition = record['partition']
            row_count = record['row_count']
            applied_at = record['applied_at']
            
            logger.info(f"Dataset: {dataset:20} | Partition: {str(partition):30} | Rows: {row_count:8} | Applied: {applied_at}")
        
        logger.info("-" * 80)
        logger.info(f"Total datasets with data: {len(manifest_records)}")
        
        return {
            'datasets': manifest_records,
            'total': len(manifest_records)
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch status: {e}")
        return {
            'error': str(e),
            'datasets': [],
            'total': 0
        }


if __name__ == "__main__":
    list_status()