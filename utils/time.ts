export function formatGameTime(utcString: string): { time: string; date: string } {
  const dateObj = new Date(utcString);
  
  const time = new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
  }).format(dateObj);

  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);

  return { time, date };
}

export function formatDateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}