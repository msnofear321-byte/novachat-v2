export default function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2 animate-pulse">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="flex items-center gap-3">
            {i % 2 === 0 && <div className="w-10 h-10 rounded-full bg-[var(--bg-input)]" />}
            <div>
              <div className={`${i % 2 === 0 ? 'w-[180px]' : 'w-[140px]'} h-[38px] bg-[var(--bg-input)] rounded-[18px] ${i % 2 === 0 ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'}`} />
              <div className="w-12 h-2.5 bg-[var(--bg-input)] rounded-full mt-1.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
