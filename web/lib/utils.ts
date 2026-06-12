export function obfuscateEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || local.length < 4) return email;
  const first = local.slice(0, 2);
  const last = local.slice(-2);
  const stars = "*".repeat(Math.max(3, local.length - 4));
  return `${first}${stars}${last}@${domain}`;
}

export function getMondayMidnightWAT(): Date {
  const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1
  const nowUTC = Date.now();
  const nowWAT = new Date(nowUTC + WAT_OFFSET_MS);

  const dayOfWeek = nowWAT.getUTCDay(); // 0=Sun, 1=Mon
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mondayWAT = new Date(nowWAT);
  mondayWAT.setUTCDate(nowWAT.getUTCDate() - daysToMonday);
  mondayWAT.setUTCHours(0, 0, 0, 0);

  return new Date(mondayWAT.getTime() - WAT_OFFSET_MS);
}

export function getTodayRangeWAT(): { start: Date; end: Date } {
  const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1
  const nowWAT = new Date(Date.now() + WAT_OFFSET_MS);
  const startWAT = new Date(nowWAT);
  startWAT.setUTCHours(0, 0, 0, 0);
  const start = new Date(startWAT.getTime() - WAT_OFFSET_MS); // today 00:00 WAT, as UTC
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // tomorrow 00:00 WAT, as UTC
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
