export interface Team {
  name: string;
  short_name: string;
  conference: string;
  rank: number | null;
  logo_url: string;
  logo?: string | null;
}

export interface GameOdds {
  spread: string | null;
  over_under: number | null;
  predicted_spread: string | null; // e.g., "OSU -6.5"
}

// NEW: Interface for live score data from your provider
export interface LiveScoreData {
  id: string; // API-specific game ID used for matching
  status: 'scheduled' | 'in_progress' | 'completed';
  clock: string | null; // e.g., "14:52"
  period: number | null; // e.g., 4 (Quarter)
  home_score: number;
  away_score: number;
}

// EXTENDED: The Game object used in the UI now holds optional live data
export interface Game {
  id: string;
  neutral_site: boolean;
  location: string;
  broadcast: string;
  home_team: Team;
  away_team: Team;
  slot_utc?: string; // Optional property for the time slot's UTC time
  odds: GameOdds;
  // Add this optional property
  live_data?: LiveScoreData; 
}

export interface TimeSlot {
  slot_label: string;
  slot_utc: string;
  games: Game[];
}

export interface ScheduleResponse {
  season: number;
  week: number;
  week_label: string;
  date_range: string;
  time_slots: TimeSlot[];
}

export interface FilterState {
  conferences: string[];
  predictedOnly: boolean;
}