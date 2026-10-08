export function formatDate(isoString: string): string {
  if (!isoString) return 'Not specified';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString: string | null): string {
  if (!isoString) return 'Not specified';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function formatTimeRange(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${startStr} — ${endStr}`;
  } catch {
    return '';
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function getPriorityStyles(priority?: string) {
  switch (priority) {
    case 'HIGH':
      return {
        bg: 'bg-[#E76F51]/12 text-[#E76F51] border-[#E76F51]/30 font-bold',
        dot: 'bg-[#E76F51]'
      };
    case 'LOW':
      return {
        bg: 'bg-[#2F7D5A]/12 text-[#2F7D5A] border-[#2F7D5A]/30 font-bold',
        dot: 'bg-[#2F7D5A]'
      };
    case 'MEDIUM':
    default:
      return {
        bg: 'bg-[#E9B949]/15 text-[#9E730B] border-[#E9B949]/35 font-bold',
        dot: 'bg-[#E9B949]'
      };
  }
}
