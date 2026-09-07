export default function ScheduleSkeleton() {
  return (
    <div className="px-4 mt-4 space-y-6 animate-pulse">
      {[1, 2].map((slotIdx) => (
        <div key={slotIdx} className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-48 mb-2" />
          {[1, 2].map((gameIdx) => (
            <div 
              key={gameIdx}
              className="bg-[#161E2E] border border-white/5 rounded-2xl p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-white/10 rounded w-36" />
                <div className="h-4 bg-white/10 rounded w-12" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-white/10 rounded w-44" />
                <div className="h-4 bg-white/10 rounded w-12" />
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                <div className="h-3 bg-white/10 rounded w-28" />
                <div className="h-6 bg-white/10 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}