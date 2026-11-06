const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number) => String(n).padStart(2, "0");

/** The name a new project starts with, like "Nov 05 - 16:38". It is rename-able. */
export function defaultProjectName(date: Date = new Date()): string {
  return `${MONTHS[date.getMonth()]} ${two(date.getDate())} - ${two(date.getHours())}:${two(date.getMinutes())}`;
}
