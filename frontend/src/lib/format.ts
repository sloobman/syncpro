/**
 * Возвращает относительное время на русском языке.
 */
export function formatRelativeTime(dateString: string): string {
  if (typeof window === "undefined") {
    return "недавно";
  }
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 30) {
    return 'только что';
  }

  if (diffMinutes < 1) {
    return `${diffSeconds} ${pluralize(diffSeconds, 'секунду', 'секунды', 'секунд')} назад`;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralize(diffMinutes, 'минуту', 'минуты', 'минут')} назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${pluralize(diffHours, 'час', 'часа', 'часов')} назад`;
  }

  if (diffDays === 1) {
    return 'вчера';
  }

  if (diffDays < 7) {
    return `${diffDays} ${pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
  }

  if (diffWeeks < 4) {
    return `${diffWeeks} ${pluralize(diffWeeks, 'неделю', 'недели', 'недель')} назад`;
  }

  if (diffMonths < 12) {
    return `${diffMonths} ${pluralize(diffMonths, 'месяц', 'месяца', 'месяцев')} назад`;
  }

  return `${diffYears} ${pluralize(diffYears, 'год', 'года', 'лет')} назад`;
}

/**
 * Русская плюрализация: выбирает правильную форму слова.
 */
function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;

  if (abs > 10 && abs < 20) {
    return many;
  }
  if (lastDigit > 1 && lastDigit < 5) {
    return few;
  }
  if (lastDigit === 1) {
    return one;
  }
  return many;
}

/**
 * Форматирует дату в русской локали: «15 октября 2024 г.»
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Форматирует число с разделителями тысяч: 1 234 567
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}
