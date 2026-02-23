export default function FeedLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-border rounded" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 border border-border rounded-lg bg-surface-alt"
          />
        ))}
      </div>
    </div>
  );
}
