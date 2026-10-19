export function toKstFields(isoTimestamp) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(isoTimestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

export function fromKstFields(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('운영 날짜와 시작 시간을 확인해 주세요.');
  }

  const timestamp = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(timestamp.getTime())) throw new Error('운영 날짜와 시작 시간을 확인해 주세요.');
  const normalized = toKstFields(timestamp.toISOString());
  if (normalized.date !== date || normalized.time !== time) throw new Error('운영 날짜와 시작 시간을 확인해 주세요.');
  return timestamp.toISOString();
}
