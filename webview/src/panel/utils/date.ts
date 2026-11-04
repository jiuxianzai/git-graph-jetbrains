import { t } from "../../shared/i18n";

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/** `2026/11/04 16:56` — always the full timestamp. */
export function formatFullDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

/**
 * Compact date for the Git Log list:
 * - today     → `今天 16:56`
 * - yesterday → `昨天 09:26`
 * - older     → `2026/11/04 16:56`
 */
export function formatCommitDate(dateStr: string, now = new Date()): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const time = `${hh}:${min}`;
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff === 0) return t("Today {time}", { time });
  if (dayDiff === 1) return t("Yesterday {time}", { time });
  return formatFullDateTime(dateStr);
}
