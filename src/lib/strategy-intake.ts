/**
 * Single source of truth for strategy-call scarcity / intake copy
 * (hero pill, sticky bar, final CTA badge). Date uses Australia/Sydney.
 */

export const STRATEGY_SPOTS_LEFT = 2 as const;

const ORDINAL_SUFFIX = (n: number): string => {
  const j = n % 10;
  const k = n % 100;
  if (k >= 11 && k <= 13) return "th";
  if (j === 1) return "st";
  if (j === 2) return "nd";
  if (j === 3) return "rd";
  return "th";
};

export function ordinalDay(day: number): string {
  return `${day}${ORDINAL_SUFFIX(day)}`;
}

/** e.g. "4th April" in US Eastern (Miami) on the given instant */
export function formatIntakeCalendarDate(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "America/New_York",
    day: "numeric",
    month: "long",
  });
  const parts = fmt.formatToParts(now);
  const dayStr = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = dayStr ? parseInt(dayStr, 10) : 1;
  return `${ordinalDay(day)} ${month}`;
}

export interface StrategyIntakeCopy {
  /** Hero pill + sticky bar (identical) */
  primaryLine: string;
  /** Final CTA amber chip (uppercase for tracking-widest UI) */
  finalCtaUrgency: string;
}

export function getStrategyIntakeCopy(now: Date = new Date()): StrategyIntakeCopy {
  const cal = formatIntakeCalendarDate(now);
  const spots = STRATEGY_SPOTS_LEFT;
  const primaryLine = `Free Strategy Call · ${cal} Intake · ${spots} spots left`;
  const finalCtaUrgency = `${cal} Intake · ${spots} spots remaining`.toUpperCase();
  return { primaryLine, finalCtaUrgency };
}
