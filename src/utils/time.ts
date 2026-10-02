/**
 * يحوّل ISO timestamp لنص "منذ X"
 * مثال: "منذ 5 د" أو "منذ 2 س" أو "منذ 3 أيام"
 */
export function timeAgo(iso: string): string {
  if (!iso) return 'الآن';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'الآن';
  if (diff < 60) return `منذ ${diff} د`;
  const h = Math.floor(diff / 60);
  if (h < 24)   return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return `منذ ${d} ${d === 1 ? 'يوم' : 'أيام'}`;
}

/**
 * نسخة مختصرة بدون "منذ" — للـ cards الضيقة
 * مثال: "5د" أو "2س" أو "3ي"
 */
export function timeAgoShort(iso: string): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

/**
 * يحوّل عدد ثواني لـ HH:MM:SS
 */
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => n.toString().padStart(2, '0')).join(':');
}

/**
 * يحوّل دقائق لنص مثل "2س 30د" أو "45د"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h}س`;
}