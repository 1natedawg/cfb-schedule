'use client';
import { FilterState } from '@/types/schedule';
import { X, Check } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableConferences: string[];
}

export default function FilterModal({
  isOpen,
  onClose,
  filters,
  setFilters,
  availableConferences,
}: FilterModalProps) {
  if (!isOpen) return null;

  const toggleConference = (conf: string) => {
    setFilters((prev) => {
      const exists = prev.conferences.includes(conf);
      return {
        ...prev,
        conferences: exists
          ? prev.conferences.filter((c) => c !== conf)
          : [...prev.conferences, conf],
      };
    });
  };

  const clearFilters = () => {
    setFilters({ conferences: [], predictedOnly: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full sm:max-w-md bg-[#161E2E] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-base font-bold text-white">Schedule Filters</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prediction Toggle Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Prediction Status
          </label>
          <button
            onClick={() => setFilters(prev => ({ ...prev, predictedOnly: !prev.predictedOnly }))}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition ${
              filters.predictedOnly 
                ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                : 'bg-white/5 border-white/5 text-gray-300'
            }`}
          >
            <span>Only show games with model predictions</span>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${filters.predictedOnly ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/20'}`}>
              {filters.predictedOnly && <Check className="w-3 h-3" />}
            </div>
          </button>
        </div>

        {/* Conferences Multi-Select Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Conferences
            </label>
            {filters.conferences.length > 0 && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, conferences: [] }))}
                className="text-xs text-blue-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {availableConferences.map((conf) => {
              const isSelected = filters.conferences.includes(conf);
              return (
                <button
                  key={conf}
                  onClick={() => toggleConference(conf)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {conf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/5 flex gap-3">
          <button
            onClick={clearFilters}
            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold text-xs hover:bg-white/10 transition"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}