export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function toDayKey(date: Date) {
  return startOfDay(date).getTime();
}

export function formatShortDate(timestamp: number) {
  const date = new Date(timestamp);
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  } catch {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}.${month}`;
  }
}

export function formatRelativeDate(timestamp: number) {
  const todayKey = toDayKey(new Date());
  const yesterdayKey = todayKey - 24 * 60 * 60 * 1000;

  if (timestamp === todayKey) {
    return 'Сегодня';
  }
  if (timestamp === yesterdayKey) {
    return 'Вчера';
  }

  return formatShortDate(timestamp);
}
