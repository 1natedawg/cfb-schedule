// utils/predictionMath.ts

/**
 * Parses spread string (e.g., "OSU -3.5", "Michigan +7") into structured data.
 */
export function parseSpread(spreadStr: string | null) {
  if (!spreadStr) return null;
  // Regex looks for: (Team Abbreviation) (Optional +/-)(Number)
  const match = spreadStr.match(/([A-Za-z\s]+)\s*([+-]?\d+\.?\d*)/);
  if (!match) return null;
  
  return {
    teamAbbr: match[1].trim(),
    points: parseFloat(match[2]),
  };
}

/**
 * Calculates if the favorite is currently covering based on the provided scores.
 * Returns TRUE if favorite is covering, FALSE if underdog is covering, NULL if unkown/push.
 */
export function isFavoriteCovering(
  predictedSpread: string | null,
  homeTeamAbbr: string,
  homeScore: number,
  awayScore: number
): boolean | null {
  const prediction = parseSpread(predictedSpread);
  if (!prediction) return null;

  const actualMargin = homeScore - awayScore;
  const isHomeFavorite = prediction.points < 0; // e.g., OSU -6.5
  
  let favoriteCovering = false;

  if (isHomeFavorite) {
    // Home team is favorite. Did they win by MORE than the spread points?
    // (Note: prediction.points is negative, e.g., -6.5)
    favoriteCovering = actualMargin > Math.abs(prediction.points);
  } else {
    // Away team is favorite (e.g., Michigan -3)
    // Did away team win by more than their spread?
    // Equivalent to: Home team lost by more than 3.
    favoriteCovering = actualMargin < -Math.abs(prediction.points);
  }

  // Handle pushes (rare in spreads, but possible)
  if (actualMargin === Math.abs(prediction.points)) return null;

  return favoriteCovering;
}