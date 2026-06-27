interface SavedMarkPreviewProps {
  label: string;
  dataUrl: string;
  className?: string;
}

export function SavedMarkPreview({ label, dataUrl, className }: SavedMarkPreviewProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-slate-500">{label}</p>
      <div className="inline-block rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={label} className="h-12 max-w-[160px] object-contain" />
      </div>
    </div>
  );
}
