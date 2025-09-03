/**
 * NFL season and week utilities
 */

export interface NFLWeek {
  season: number;
  week: number;
}

/**
 * Get current NFL season and week based on date
 * NFL regular season typically starts in early September and goes through early January
 * Each week runs Thursday to Wednesday
 */
export function getCurrentNFLWeek(): NFLWeek {
  const now = new Date();
  const year = now.getFullYear();
  
  // NFL season typically starts in September
  // For simplicity, we'll use September 7th as a typical season start
  const seasonStart = new Date(year, 8, 7); // September 7th of current year
  
  // If we're before the season start, we're in the previous season
  if (now < seasonStart) {
    return {
      season: year - 1,
      week: 18 // End of previous season
    };
  }
  
  // Calculate week based on days since season start
  const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.min(Math.floor(daysSinceStart / 7) + 1, 18);
  
  return {
    season: year,
    week
  };
}

/**
 * Check if a given NFL week has occurred (i.e., games have been played)
 * Games are typically played Thursday-Monday, so we consider a week "occurred" 
 * if it's Tuesday after that week
 */
export function hasNFLWeekOccurred(season: number, week: number): boolean {
  const current = getCurrentNFLWeek();
  
  // If it's a previous season, it has definitely occurred
  if (season < current.season) {
    return true;
  }
  
  // If it's a future season, it hasn't occurred
  if (season > current.season) {
    return false;
  }
  
  // Same season - check if the week has passed
  // We add a buffer of 2 days after the week starts to account for games
  const currentWeekWithBuffer = current.week;
  
  return week < currentWeekWithBuffer;
}

/**
 * Get all weeks that have occurred for a given season
 */
export function getOccurredWeeks(season: number): number[] {
  const weeks: number[] = [];
  
  // Check weeks 1-22 (regular season + playoffs)
  for (let week = 1; week <= 22; week++) {
    if (hasNFLWeekOccurred(season, week)) {
      weeks.push(week);
    }
  }
  
  return weeks;
}

/**
 * Get a display string for the NFL week
 */
export function getNFLWeekDisplay(season: number, week: number): string {
  if (week <= 18) {
    return `Week ${week}, ${season}`;
  } else if (week === 19) {
    return `Wild Card, ${season}`;
  } else if (week === 20) {
    return `Divisional, ${season}`;
  } else if (week === 21) {
    return `Conference Championship, ${season}`;
  } else if (week === 22) {
    return `Super Bowl, ${season}`;
  }
  return `Week ${week}, ${season}`;
}