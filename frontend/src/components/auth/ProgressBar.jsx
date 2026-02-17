export default function ProgressBar({ currentStep }) {
  return (
    <div className="flex gap-2 mb-7">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex-1 h-[3px] rounded-full transition-all duration-300 ease-in-out ${
            s <= currentStep ? 'bg-accent' : 'bg-surface-tertiary'
          }`}
        />
      ))}
    </div>
  );
}
