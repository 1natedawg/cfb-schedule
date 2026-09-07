export interface Team {
  name: string;
  short_name: string;
  conference: string;
  rank: number | null;
  logo_url: string;
}

export interface GameOdds {
  spread: string | null;
  over_under: number | null;
  predicted_spread: string | null;
}

export interface Game {
  id: string;
  neutral_site: boolean;
  location: string;
  broadcast: string;
  home_team: Team;
  away_team: Team;
  odds: GameOdds;
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