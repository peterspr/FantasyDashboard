from typing import List, Optional, Dict, Any
import pandas as pd
from prefect import get_run_logger

try:
    import nfl_data_py as nfl
except ImportError:
    # Fallback for testing or if library is not available
    nfl = None


class NFLVerseLoader:
    """Loader for nflverse datasets via nfl_data_py."""
    
    def __init__(self):
        self.logger = get_run_logger()
        
        if nfl is None:
            raise ImportError("nfl_data_py is required for data loading")
    
    def import_players(self, **kwargs) -> pd.DataFrame:
        """Load players data."""
        self.logger.info("Loading players data")
        
        try:
            # nfl_data_py.import_players() - master player list
            df = nfl.import_players()
            self.logger.info(f"Loaded {len(df)} players")
            
            # Ensure we have a player_id column
            if 'player_id' not in df.columns and 'gsis_id' in df.columns:
                df['player_id'] = df['gsis_id']
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load players: {e}")
            raise
    
    def import_rosters(self, years: List[int], **kwargs) -> pd.DataFrame:
        """Load rosters data for specified years."""
        self.logger.info(f"Loading rosters for years: {years}")
        
        try:
            # nfl_data_py.import_seasonal_rosters() - team rosters by season
            df = nfl.import_seasonal_rosters(years=years)
            self.logger.info(f"Loaded {len(df)} roster records")
            
            # Ensure we have required columns
            if 'player_id' not in df.columns and 'gsis_id' in df.columns:
                df['player_id'] = df['gsis_id']
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load rosters: {e}")
            raise
    
    def import_schedules(self, years: List[int], **kwargs) -> pd.DataFrame:
        """Load schedules data for specified years."""
        self.logger.info(f"Loading schedules for years: {years}")
        
        try:
            # nfl_data_py.import_schedules() - game schedules
            df = nfl.import_schedules(years=years)
            self.logger.info(f"Loaded {len(df)} schedule records")
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load schedules: {e}")
            raise
    
    def import_weekly_data(self, years: List[int], weeks: Optional[List[int]] = None, **kwargs) -> pd.DataFrame:
        """Load weekly player stats."""
        self.logger.info(f"Loading weekly data for years: {years}, weeks: {weeks}")
        
        try:
            # nfl_data_py.import_weekly_data() - weekly player stats
            # Note: nfl_data_py uses different parameter names
            if weeks:
                df = nfl.import_weekly_data(years=years)
                # Filter for specific weeks after loading
                if len(weeks) > 0:
                    df = df[df['week'].isin(weeks)]
            else:
                df = nfl.import_weekly_data(years=years)
            
            self.logger.info(f"Loaded {len(df)} weekly stat records")
            
            # Ensure we have required columns
            if 'player_id' not in df.columns and 'gsis_id' in df.columns:
                df['player_id'] = df['gsis_id']
            
            # Handle duplicate team column issue - rename recent_team to team
            if 'recent_team' in df.columns:
                # Drop the existing team column if it exists to avoid duplicates
                if 'team' in df.columns:
                    df = df.drop(columns=['team'])
                df = df.rename(columns={'recent_team': 'team'})
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load weekly data: {e}")
            raise
    
    def import_snap_counts(self, years: List[int], weeks: Optional[List[int]] = None, **kwargs) -> pd.DataFrame:
        """Load snap counts/participation data."""
        self.logger.info(f"Loading snap counts for years: {years}, weeks: {weeks}")
        
        try:
            # nfl_data_py.import_snap_counts() - snap count data
            # Note: nfl_data_py uses different parameter names
            if weeks:
                df = nfl.import_snap_counts(years=years)
                # Filter for specific weeks after loading
                if len(weeks) > 0:
                    df = df[df['week'].isin(weeks)]
            else:
                df = nfl.import_snap_counts(years=years)
            
            self.logger.info(f"Loaded {len(df)} snap count records")
            
            # Ensure we have required columns - snap counts uses pfr_player_id
            if 'player_id' not in df.columns:
                if 'gsis_id' in df.columns:
                    df['player_id'] = df['gsis_id']
                elif 'pfr_player_id' in df.columns:
                    df['player_id'] = df['pfr_player_id']
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load snap counts: {e}")
            raise
    
    def import_injuries(self, years: List[int], weeks: Optional[List[int]] = None, **kwargs) -> pd.DataFrame:
        """Load injury report data."""
        self.logger.info(f"Loading injuries for years: {years}, weeks: {weeks}")
        
        try:
            # nfl_data_py.import_injuries() - injury reports
            # Note: nfl_data_py uses different parameter names
            if weeks:
                df = nfl.import_injuries(years=years)
                # Filter for specific weeks after loading
                if len(weeks) > 0:
                    df = df[df['week'].isin(weeks)]
            else:
                df = nfl.import_injuries(years=years)
            
            self.logger.info(f"Loaded {len(df)} injury records")
            
            # Ensure we have required columns
            if 'player_id' not in df.columns and 'gsis_id' in df.columns:
                df['player_id'] = df['gsis_id']
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load injuries: {e}")
            raise
    
    def import_depth_charts(self, years: List[int], weeks: Optional[List[int]] = None, **kwargs) -> pd.DataFrame:
        """Load depth chart data."""
        self.logger.info(f"Loading depth charts for years: {years}, weeks: {weeks}")
        
        try:
            # nfl_data_py.import_depth_charts() - team depth charts
            # Note: nfl_data_py uses different parameter names
            df = nfl.import_depth_charts(years=years)
            
            # Filter for specific weeks after loading if week column exists
            if weeks and len(weeks) > 0 and 'week' in df.columns:
                df = df[df['week'].isin(weeks)]
            
            self.logger.info(f"Loaded {len(df)} depth chart records")
            
            # Ensure we have required columns for depth charts
            if 'player_id' not in df.columns and 'gsis_id' in df.columns:
                df['player_id'] = df['gsis_id']
            
            # Handle team column for depth charts - they might use different names
            team_columns = ['club_code', 'club', 'tm', 'team_abbr', 'franchise_id', 'team_name']
            for col in team_columns:
                if col in df.columns and 'team' not in df.columns:
                    df = df.rename(columns={col: 'team'})
                    break
            
            # If still no team column, check what columns we have
            if 'team' not in df.columns:
                self.logger.warning(f"Depth charts columns: {list(df.columns)}")
                # Use a fallback - create empty team column if needed
                df['team'] = ''
            
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to load depth charts: {e}")
            raise
    
    def load_dataset(self, loader_fn: str, **kwargs) -> pd.DataFrame:
        """Load dataset by function name."""
        if not hasattr(self, loader_fn):
            raise ValueError(f"Unknown loader function: {loader_fn}")
        
        loader = getattr(self, loader_fn)
        return loader(**kwargs)


def get_nflverse_loader() -> NFLVerseLoader:
    """Get NFLVerse loader instance."""
    return NFLVerseLoader()