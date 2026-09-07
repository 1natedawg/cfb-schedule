'use client';
import { useState, useEffect } from 'react';
import { ScheduleResponse, Game, FilterState } from '@/types/schedule';
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import FilterModal from '@/components/FilterModal';
import { SlidersHorizontal } from 'lucide-react';

const AVAILABLE_CONFERENCES = ['SEC', 'Big Ten', 'ACC', 'Big 12', 'Pac-12', 'Independents'];

interface WeekOption {
  week: number;
  label: string;
  date_range: string;
}

export default function ScheduleViewer() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  
  const [weeksList, setWeeksList] = useState<WeekOption[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  
  const [isLoadingWeeks, setIsLoadingWeeks] = useState<boolean>(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);
  
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    conferences: [],
    predictedOnly: false,
  });

  // 1. Fetch available weeks for the season when the year changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingWeeks(true);

    fetch(`/api/weeks?year=${selectedYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setWeeksList(data.weeks);
          // Default to the first week available if current selection isn't in list
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

  // 2. Fetch schedule data whenever year or week changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSchedule(true);

    fetch(`/api/schedule?year=${selectedYear}&week=${selectedWeek}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setSchedule(data);
          setIsLoadingSchedule(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load schedule:', err);
        setIsLoadingSchedule(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedYear, selectedWeek]);

  const activeFilterCount = filters.conferences.length + (filters.predictedOnly ? 1 : 0);

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white pb-28">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#0B0F19]/85 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-base font-bold tracking-tight">CFB Schedule</h1>
        </div>
        
        <button 
          onClick={() => setIsFilterOpen(true)}
          className={`relative flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all active:scale-95 ${
            activeFilterCount > 0 
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

      {/* Week Selector Carousel */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-white/5 bg-[#0B0F19]">
        {isLoadingWeeks ? (
          <div className="text-xs text-gray-500 py-2 animate-pulse">Loading weeks...</div>
        ) : (
          weeksList.map((wk) => (
            <button
              key={wk.week}
              onClick={() => setSelectedWeek(wk.week)}
              className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all active:scale-95 flex flex-col items-start gap-0.5 ${
                selectedWeek === wk.week
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

      {/* Schedule Feed Content */}
      {isLoadingSchedule || !schedule ? (
        <ScheduleSkeleton />
      ) : (
        <div className="px-4 mt-4 space-y-6">
          {schedule.time_slots && schedule.time_slots.length > 0 ? (
            // Sort time slots chronologically using slot_utc before mapping
            [...schedule.time_slots]
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
                    <div className="sticky top-14 z-20 bg-[#0B0F19]/95 backdrop-blur-md py-2.5 text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-white/5">
                      {slot.slot_label}
                    </div>

                    <div className="space-y-3">
                      {filteredGames.map((game: Game) => (
                        <div 
                          key={game.id}
                          className="bg-[#161E2E] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3 hover:border-white/10 transition-all active:scale-[0.99]"
                        >
                          {/* Away Team */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                {game.away_team.rank ? `#${game.away_team.rank}` : ''}
                              </span>
                              <span className="font-semibold text-sm tracking-tight">{game.away_team.name}</span>
                            </div>
                            <span className="text-[11px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                              {game.away_team.conference}
                            </span>
                          </div>

                          {/* Home Team */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                {game.home_team.rank ? `#${game.home_team.rank}` : ''}
                              </span>
                              <span className="font-semibold text-sm tracking-tight">{game.home_team.name}</span>
                            </div>
                            <span className="text-[11px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                              {game.home_team.conference}
                            </span>
                          </div>

                          {/* Meta info & Odds */}
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
                                <span className="bg-emerald-500/10 text-emerald-400 font-medium px-2 py-1 rounded-md border border-emerald-500/20">
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
                      ))}
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

      {/* Filter Modal Drawer */}
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