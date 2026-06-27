export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className || ""}`}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-sky-100 border-t-sky-500" />
    </div>
  );
}
