from typing import List, Optional, Dict, Any

from prefect import flow, get_run_logger

from fantasy_ingest.adapters.registry import get_dataset_registry
from fantasy_ingest.runners.load_partition import load_partition


@flow(name="backfill")
def backfill(seasons: List[int], weeks: Optional[List[int]] = None) -> Dict[str, Any]:
    """Backfill flow for historical data across seasons and weeks."""
    
    logger = get_run_logger()
    logger.info(f"Running backfill for seasons {seasons}, weeks: {weeks}")
    
    # Load dataset registry
    registry = get_dataset_registry()
    
    results = []
    
    # Process each season
    for season in seasons:
        logger.info(f"Processing season {season}")
        
        # Process weekly datasets
        weekly_datasets = registry.get_weekly_datasets()
        for dataset_config in weekly_datasets:
            if weeks:
                # Process specific weeks
                for week in weeks:
                    partition = {'season': season, 'week': week}
                    try:
                        result = load_partition(dataset_config, partition)
                        results.append(result)
                    except Exception as e:
                        logger.error(f"Failed to load {dataset_config.id} {partition}: {e}")
                        results.append({
                            'dataset': dataset_config.id,
                            'partition': partition,
                            'status': 'failed',
                            'message': str(e)
                        })
            else:
                # Process all weeks for the season (1-18 for regular season + playoffs)
                for week in range(1, 19):
                    partition = {'season': season, 'week': week}
                    try:
                        result = load_partition(dataset_config, partition)
                        results.append(result)
                    except Exception as e:
                        logger.warning(f"Failed to load {dataset_config.id} {partition}: {e}")
                        results.append({
                            'dataset': dataset_config.id,
                            'partition': partition,
                            'status': 'failed',
                            'message': str(e)
                        })
        
        # Process seasonal datasets (once per season)
        seasonal_datasets = registry.get_seasonal_datasets()
        for dataset_config in seasonal_datasets:
            partition = {'season': season}
            try:
                result = load_partition(dataset_config, partition)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to load {dataset_config.id} {partition}: {e}")
                results.append({
                    'dataset': dataset_config.id,
                    'partition': partition,
                    'status': 'failed',
                    'message': str(e)
                })
    
    # Process snapshot datasets (once per backfill run)
    snapshot_datasets = registry.get_snapshot_datasets()
    if snapshot_datasets:
        from datetime import datetime
        snapshot_date = datetime.now().strftime('%Y-%m-%d')
        
        for dataset_config in snapshot_datasets:
            partition = {'snapshot_date': snapshot_date}
            try:
                result = load_partition(dataset_config, partition)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to load {dataset_config.id} {partition}: {e}")
                results.append({
                    'dataset': dataset_config.id,
                    'partition': partition,
                    'status': 'failed',
                    'message': str(e)
                })
    
    # Summary
    successful = [r for r in results if r.get('status') == 'success']
    failed = [r for r in results if r.get('status') == 'failed']
    
    logger.info(f"Backfill completed: {len(successful)} successful, {len(failed)} failed")
    
    if failed:
        logger.warning(f"Failed partitions: {len(failed)} (some may be expected for missing weeks)")
    
    return {
        'seasons': seasons,
        'weeks': weeks,
        'total_partitions': len(results),
        'successful': len(successful),
        'failed': len(failed),
        'results': results
    }


if __name__ == "__main__":
    import sys
    
    # Parse command line arguments for seasons
    seasons = [2023, 2024]  # Default seasons
    if len(sys.argv) > 1:
        try:
            seasons = [int(s) for s in sys.argv[1].split(',')]
        except ValueError:
            print("Usage: python backfill.py [seasons,comma,separated]")
            sys.exit(1)
    
    backfill(seasons)