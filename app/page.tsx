'use client';
import { useState, useEffect, useMemo } from 'react';
import { ScheduleResponse, Game, FilterState } from '@/types/schedule';
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import FilterModal from '@/components/FilterModal';
import { SlidersHorizontal, Trophy, CircleAlert } from 'lucide-react';
import { isFavoriteCovering } from '@/utils/predictionMath';

const AVAILABLE_CONFERENCES = ['SEC', 'Big Ten', 'ACC', 'Big 12', 'Pac-12', 'Independents'];

interface WeekOption {
  week: number;
  label: string;
  date_range: string;
}

interface LiveGameApiData {
  id: string;
  clock: string;
  situation: string | null;
  period: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'completed' | 'in_progress';
}

async function fetchLiveScoresAction(): Promise<{ success: boolean; data?: LiveGameApiData[] }> {
  try {
    const res = await fetch('/api/live-scores', { next: { revalidate: 10 } });
    const result = await res.json();
    return result;
  } catch (error) {
    console.error("Action failed:", error);
    return { success: false };
  }
}

const nameNormalizationMap: Record<string, string> = {
  "Ohio St.": "Ohio State Buckeyes",
  "Michigan St.": "Michigan State Spartans",
  "Ole Miss": "Ole Miss Rebels",
  "Miami (FL)": "Miami Hurricanes",
};

function normalizeName(name: string): string {
  return nameNormalizationMap[name] || name;
}

export default function ScheduleViewer() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [weeksList, setWeeksList] = useState<WeekOption[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [liveScores, setLiveScores] = useState<LiveGameApiData[]>([]);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState<boolean>(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    conferences: [],
    predictedOnly: false,
  });

  // 1. Fetch weeks
  useEffect(() => {
    let isMounted = true;
    setIsLoadingWeeks(true);

    fetch(`/api/weeks?year=${selectedYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setWeeksList(data.weeks);
          if (data.weeks.length > 0 && !data.weeks.some((w: WeekOption) => w.week === selectedWeek)) {
            setSelectedWeek(data.weeks[0].week);
          }
        }
        setIsLoadingWeeks(false);
      })
      .catch((err) => {
        console.error('Failed to load weeks:', err);
        setIsLoadingWeeks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  // 2. Fetch Static Schedule
  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingSchedule(true);
    setLiveScores([]);

    fetch(`/api/schedule?year=${selectedYear}&week=${selectedWeek}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.time_slots)) {
          setSchedule(data);
        } else {
          if (data?.error) {
            console.error('Schedule API error:', data.error);
          }
          setSchedule(null);
        }
        setIsLoadingSchedule(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Failed to load schedule:', err);
        setSchedule(null);
        setIsLoadingSchedule(false);
      });

    return () => controller.abort();
  }, [selectedYear, selectedWeek]);

  // 3. Poll Live Scores
  useEffect(() => {
    const poll = async () => {
      setIsPolling(true);
      console.log('Polling live scores for week:', selectedWeek);
      const result = await fetchLiveScoresAction();
      if (result.success && result.data) {
        // console.log('Fetched live scores:', result.data);
        setLiveScores(result.data);
      }
      setIsPolling(false);
    };

    poll();
    const intervalId = setInterval(poll, 15000);
    return () => clearInterval(intervalId);
  }, [selectedWeek]);

  // 4. Merge Data
  // 4. Merge Data using Game IDs
  const scheduleWithLiveData = useMemo(() => {
    if (!schedule || !Array.isArray(schedule.time_slots)) return null;
    const enriched = JSON.parse(JSON.stringify(schedule)) as ScheduleResponse;

    // Optional: Create a lookup map for faster matching
    const liveScoreMap = new Map(liveScores.map(score => [score.id, score]));

    enriched.time_slots.forEach(slot => {
      if (!Array.isArray(slot.games)) return;

      slot.games.forEach(game => {
        // Direct ID match!
        const liveData = liveScoreMap.get(game.id);

        if (liveData) {
          game.live_data = {
            id: liveData.id,
            status: liveData.status,
            clock: liveData.situation || liveData.clock,
            period: liveData.period,
            home_score: liveData.home_score,
            away_score: liveData.away_score,
          };
        }
      });
    });

    return enriched;
  }, [schedule, liveScores]);

  const GameStatusDisplay = ({ game }: { game: Game }) => {
    const live = game.live_data;
    if (!live || live.status === 'scheduled') {
      return (
        <div className="text-xs text-gray-400">
          {game.slot_utc && new Date(game.slot_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      );
    }
    if (live.status === 'completed') {
      return <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">completed</div>;
    }
    if (live.status === 'in_progress') {
      return <div className="text-xs font-bold text-amber-400 animate-pulse">in_progress</div>;
    }

    const periodText = live.period === 5 ? 'OT' : `${live.period}Q`;
    return (
      <div className="text-xs font-mono font-medium text-emerald-400 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        {periodText} {live.clock}
      </div>
    );
  };

  const PredictionPill = ({ game }: { game: Game }) => {
    if (!game.odds.predicted_spread || !game.live_data) return null;

    const live = game.live_data;
    const iscompleted = live.status === 'completed';
    const isLive = live.status === 'in_progress';

    const coveringResult = isFavoriteCovering(
      game.odds.predicted_spread,
      game.home_team.short_name,
      live.home_score,
      live.away_score
    );

    if (coveringResult === null) return null;

    if (isLive) {
      if (coveringResult) {
        return (
          <div className="flex items-center gap-1.5 text-xs bg-emerald-950/50 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800">
            <Trophy className="w-3 h-3 text-emerald-400" />
            <span>Model is covering ({game.odds.predicted_spread})</span>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-1.5 text-xs bg-red-950/50 text-red-300 px-3 py-1 rounded-full border border-red-800">
            <CircleAlert className="w-3 h-3 text-red-400" />
            <span>Model is failing ({game.odds.predicted_spread})</span>
          </div>
        );
      }
    }

    if (iscompleted) {
      if (coveringResult) {
        return (
          <div className="flex items-center gap-1.5 text-xs bg-emerald-500 text-white px-3 py-1 rounded-full font-medium">
            <Trophy className="w-3.5 h-3.5" />
            <span>Model HIT ({game.odds.predicted_spread})</span>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-200 px-3 py-1 rounded-full">
            <CircleAlert className="w-3.5 h-3.5" />
            <span>Model MISSED ({game.odds.predicted_spread})</span>
          </div>
        );
      }
    }

    return null;
  };

  const activeFilterCount = filters.conferences.length + (filters.predictedOnly ? 1 : 0);
  const displaySchedule = scheduleWithLiveData || schedule;

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white pb-28">
      <header className="sticky top-0 z-30 bg-[#0B0F19]/85 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
          <h1 className="text-base font-bold tracking-tight">CFB Live</h1>
        </div>

        <button
          onClick={() => setIsFilterOpen(true)}
          className={`relative flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all active:scale-95 ${activeFilterCount > 0
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
              : 'bg-[#161E2E] border-white/10 text-gray-300 hover:border-white/20'
            }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-white/5 bg-[#0B0F19]">
        {isLoadingWeeks ? (
          <div className="text-xs text-gray-500 py-2 animate-pulse">Loading weeks...</div>
        ) : (
          weeksList.map((wk) => (
            <button
              key={wk.week}
              onClick={() => setSelectedWeek(wk.week)}
              className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all active:scale-95 flex flex-col items-start gap-0.5 ${selectedWeek === wk.week
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                  : 'bg-[#161E2E] text-gray-400 hover:text-white font-medium'
                }`}
            >
              <span>{wk.label}</span>
              <span className={`text-[10px] ${selectedWeek === wk.week ? 'text-blue-200' : 'text-gray-500'}`}>
                {wk.date_range}
              </span>
            </button>
          ))
        )}
      </div>

      {isLoadingSchedule || !displaySchedule ? (
        <ScheduleSkeleton />
      ) : (
        <div className="px-4 mt-4 space-y-6">
          {displaySchedule.time_slots && displaySchedule.time_slots.length > 0 ? (
            [...displaySchedule.time_slots]
              .sort((a, b) => new Date(a.slot_utc).getTime() - new Date(b.slot_utc).getTime())
              .map((slot, slotIdx) => {
                const filteredGames = slot.games.filter((game) => {
                  if (filters.predictedOnly && !game.odds.predicted_spread) return false;
                  if (filters.conferences.length > 0) {
                    const homeMatch = filters.conferences.includes(game.home_team.conference);
                    const awayMatch = filters.conferences.includes(game.away_team.conference);
                    if (!homeMatch && !awayMatch) return false;
                  }
                  return true;
                });

                if (filteredGames.length === 0) return null;

                return (
                  <section key={slotIdx} className="space-y-3">
                    <div className="sticky top-14 z-20 bg-[#0B0F19]/95 backdrop-blur-md py-2.5 text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-white/5 flex items-center justify-between">
                      <span>{slot.slot_label}</span>
                    </div>

                    <div className="space-y-3">
                      {filteredGames.map((game: Game) => {
                        const live = game.live_data;
                        const iscompleted = live?.status === 'completed';
                        const homeWinner = iscompleted && live && live.home_score > live.away_score;
                        const awayWinner = iscompleted && live && live.away_score > live.home_score;

                        return (
                          <div
                            key={game.id}
                            className="bg-[#161E2E] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3 hover:border-white/10 transition-all active:scale-[0.99]"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <GameStatusDisplay game={game} />
                              <PredictionPill game={game} />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                  {game.away_team.rank ? `#${game.away_team.rank}` : ''}
                                </span>
                                {game.away_team.logo_url && (
                                  <img src={game.away_team.logo_url} alt="" className="w-5 h-5 object-contain" />
                                )}
                                <span className={`font-semibold text-sm tracking-tight ${awayWinner ? 'text-white font-bold' : 'text-gray-200'}`}>
                                  {game.away_team.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                  {game.away_team.conference}
                                </span>
                                <span className={`font-mono text-lg font-bold w-8 text-right ${awayWinner ? 'text-white' : 'text-gray-300'}`}>
                                  {live ? live.away_score : '--'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                  {game.home_team.rank ? `#${game.home_team.rank}` : ''}
                                </span>
                                {game.home_team.logo_url && (
                                  <img src={game.home_team.logo_url} alt="" className="w-5 h-5 object-contain" />
                                )}
                                <span className={`font-semibold text-sm tracking-tight ${homeWinner ? 'text-white font-bold' : 'text-gray-200'}`}>
                                  {game.home_team.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                  {game.home_team.conference}
                                </span>
                                <span className={`font-mono text-lg font-bold w-8 text-right ${homeWinner ? 'text-white' : 'text-gray-300'}`}>
                                  {live ? live.home_score : '--'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                              <div className="text-gray-400 flex items-center gap-2">
                                <span>{game.broadcast}</span>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{game.location}</span>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                {game.odds.spread && (
                                  <span className="text-gray-300">
                                    Line: <strong className="text-white">{game.odds.spread}</strong>
                                  </span>
                                )}

                                {game.odds.predicted_spread ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 font-medium px-2 py-1 rounded-md border border-emerald-500/25">
                                    Model: {game.odds.predicted_spread}
                                  </span>
                                ) : (
                                  <span className="bg-white/5 text-gray-400 px-2 py-1 rounded-md border border-white/5">
                                    No Model Pick
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              No games scheduled or available for this week.
            </div>
          )}
        </div>
      )}

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        availableConferences={AVAILABLE_CONFERENCES}
      />
    </main>
  );
}