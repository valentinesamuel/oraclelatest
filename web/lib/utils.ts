export function obfuscateEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || local.length < 4) return email;
  const first = local.slice(0, 2);
  const last = local.slice(-2);
  const stars = "*".repeat(Math.max(3, local.length - 4));
  return `${first}${stars}${last}@${domain}`;
}

export function getThursdayMidnightWAT(): Date {
  const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1
  const nowUTC = Date.now();
  const nowWAT = new Date(nowUTC + WAT_OFFSET_MS);

  const dayOfWeek = nowWAT.getUTCDay(); // 0=Sun, 1=Mon, ..., 4=Thu
  const daysToThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;

  const thursdayWAT = new Date(nowWAT);
  thursdayWAT.setUTCDate(nowWAT.getUTCDate() - daysToThursday);
  thursdayWAT.setUTCHours(0, 0, 0, 0);

  return new Date(thursdayWAT.getTime() - WAT_OFFSET_MS);
}

export function get3DayRangeWAT(): { start: Date; end: Date } {
  const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nowWAT = new Date(Date.now() + WAT_OFFSET_MS);
  const todayWAT = new Date(nowWAT);
  todayWAT.setUTCHours(0, 0, 0, 0);
  const todayMidnightUTC = new Date(todayWAT.getTime() - WAT_OFFSET_MS);
  const start = new Date(todayMidnightUTC.getTime() - DAY_MS); // yesterday 00:00 WAT as UTC
  const end = new Date(todayMidnightUTC.getTime() + 2 * DAY_MS); // day-after-tomorrow 00:00 WAT as UTC
  return { start, end };
}

export function formatKickoffWAT(date: Date): string {
  const WAT_OFFSET_MS = 60 * 60 * 1000;
  const wat = new Date(date.getTime() + WAT_OFFSET_MS);
  const day = wat.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const time = wat.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${day} · ${time} WAT`;
}
