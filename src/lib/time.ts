export function timeAgo(input: string | null) {
  if (!input) {
    return "sin señal";
  }

  const diffMs = Date.now() - new Date(input).getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));

  if (diffSec < 60) {
    return `hace ${diffSec}s`;
  }

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `hace ${diffMin}m`;
  }

  const diffHour = Math.round(diffMin / 60);
  return `hace ${diffHour}h`;
}
