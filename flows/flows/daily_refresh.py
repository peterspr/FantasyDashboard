from datetime import datetime
from typing import Optional, List, Dict, Any

from prefect import flow, get_run_logger

from fantasy_ingest.settings import get_settings
from fantasy_ingest.adapters.registry import get_dataset_registry
from fantasy_ingest.runners.load_partition import load_partition


def get_current_nfl_week(season: int) -> int:
    """Get current NFL week. Simple implementation - can be enhanced."""
    # This is a simplified implementation
    # In production, you'd determine this from schedules or external API
    current_date = datetime.now()
    
    # NFL season typically starts in early September
    # Week 1 is usually first full week of September
    if current_date.month >= 9:
        # Rough approximation: week of year minus 35 (early September)
        week = max(1, min(18, current_date.isocalendar()[1] - 35))
    else:
        # January-August, assume we're in playoffs or offseason
        week = 18
    
    return week


@flow(name="daily_refresh")
def daily_refresh(season: Optional[int] = None, week: Optional[int] = None) -> Dict[str, Any]:
    """Daily refresh flow for current season/week data."""
    
    logger = get_run_logger()
    settings = get_settings()
    
    # Determine season and week
    if season is None:
        season = settings.get_default_season()
    
    if week is None:
        week = get_current_nfl_week(season)
    
    logger.info(f"Running daily refresh for season {season}, week {week}")
    
    # Load dataset registry
    registry = get_dataset_registry()
    
    results = []
    
    # Process weekly datasets for current week
    weekly_datasets = registry.get_weekly_datasets()
    for dataset_config in weekly_datasets:
        partition = {'season': season, 'week': week}
        try:
            result = load_partition(dataset_config, partition)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to load {dataset_config.id}: {e}")
            results.append({
                'dataset': dataset_config.id,
                'partition': partition,
                'status': 'failed',
                'message': str(e)
            })
    
    # Process seasonal datasets for current season
    seasonal_datasets = registry.get_seasonal_datasets()
    for dataset_config in seasonal_datasets:
        partition = {'season': season}
        try:
            result = load_partition(dataset_config, partition)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to load {dataset_config.id}: {e}")
            results.append({
                'dataset': dataset_config.id,
                'partition': partition,
                'status': 'failed',
                'message': str(e)
            })
    
    # Process snapshot datasets
    snapshot_datasets = registry.get_snapshot_datasets()
    snapshot_date = datetime.now().strftime('%Y-%m-%d')
    for dataset_config in snapshot_datasets:
        partition = {'snapshot_date': snapshot_date}
        try:
            result = load_partition(dataset_config, partition)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to load {dataset_config.id}: {e}")
            results.append({
                'dataset': dataset_config.id,
                'partition': partition,
                'status': 'failed',
                'message': str(e)
            })
    
    # Summary
    successful = [r for r in results if r.get('status') == 'success']
    failed = [r for r in results if r.get('status') == 'failed']
    
    logger.info(f"Daily refresh completed: {len(successful)} successful, {len(failed)} failed")
    
    if failed:
        logger.error(f"Failed datasets: {[r['dataset'] for r in failed]}")
    
    return {
        'season': season,
        'week': week,
        'total_datasets': len(results),
        'successful': len(successful),
        'failed': len(failed),
        'results': results
    }


if __name__ == "__main__":
    daily_refresh()