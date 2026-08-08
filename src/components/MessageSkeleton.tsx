export default function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Incoming messages */}
      <div className="flex justify-start">
        <div className="skeleton w-[180px] h-[38px] rounded-[16px] rounded-bl-[4px]" />
      </div>
      <div className="flex justify-start">
        <div className="skeleton w-[240px] h-[52px] rounded-[16px] rounded-bl-[4px]" />
      </div>
      {/* Own messages */}
      <div className="flex justify-end">
        <div className="skeleton w-[140px] h-[36px] rounded-[16px] rounded-br-[4px] opacity-60" />
      </div>
      <div className="flex justify-start">
        <div className="skeleton w-[100px] h-[36px] rounded-[16px] rounded-bl-[4px]" />
      </div>
      {/* Date separator placeholder */}
      <div className="flex justify-center my-2">
        <div className="skeleton w-[100px] h-[24px] rounded-full" />
      </div>
      <div className="flex justify-end">
        <div className="skeleton w-[200px] h-[44px] rounded-[16px] rounded-br-[4px] opacity-60" />
      </div>
      <div className="flex justify-start">
        <div className="skeleton w-[160px] h-[40px] rounded-[16px] rounded-bl-[4px]" />
      </div>
    </div>
  );
}
