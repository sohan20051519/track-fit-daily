// 0 = Sunday ... 6 = Saturday (matches JS getDay())
export const WEEKDAYS = [
  { idx: 1, short: "Mon", long: "Monday" },
  { idx: 2, short: "Tue", long: "Tuesday" },
  { idx: 3, short: "Wed", long: "Wednesday" },
  { idx: 4, short: "Thu", long: "Thursday" },
  { idx: 5, short: "Fri", long: "Friday" },
  { idx: 6, short: "Sat", long: "Saturday" },
  { idx: 0, short: "Sun", long: "Sunday" },
] as const;

export const todayWeekday = () => new Date().getDay();
