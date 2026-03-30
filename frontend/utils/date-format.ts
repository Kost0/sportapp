type FormatResult = {
  short: string;
  long: string;
  time: string;
};

const dtfTime = (() => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
})();

const dtfShortDate = (() => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
})();

const dtfLongParts = (() => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    });
  } catch {
    return null;
  }
})();

const safeDate = (iso: string): Date | null => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
};

const formatTime = (d: Date) => {
  if (dtfTime) {
    try {
      return dtfTime.format(d);
    } catch {
      // fall through to manual formatting
    }
  }

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatLong = (d: Date) => {
  if (dtfLongParts) {
    try {
      const parts = dtfLongParts.formatToParts(d);

      const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value;

      const day = get("day") ?? String(d.getDate());
      const month = get("month") ?? "";
      const year = get("year") ?? String(d.getFullYear());
      const weekday = get("weekday") ?? "";

      const weekdayNormalized = weekday ? weekday[0].toLowerCase() + weekday.slice(1) : "";
      return `${day} ${month} ${year}, ${weekdayNormalized}`.trim();
    } catch {
      // fall through to locale default
    }
  }

  return d.toLocaleDateString();
};

export const formatStartsAt = (iso: string, now = new Date()): FormatResult => {
  const d = safeDate(iso);
  if (!d) return { short: iso, long: iso, time: iso };

  const time = formatTime(d);
  const today = isSameDay(d, now);
  const tomorrow = isSameDay(d, addDays(now, 1));

  const shortPrefix = today ? "сегодня" : tomorrow ? "завтра" : null;
  const short = shortPrefix
    ? `${shortPrefix} в ${time}`
    : (() => {
        if (dtfShortDate) {
          try {
            const date = dtfShortDate.format(d);
            return `${date} в ${time}`;
          } catch {
            // fall through
          }
        }

        return `${d.toLocaleDateString()} ${time}`;
      })();

  return {
    short,
    long: formatLong(d),
    time,
  };
};
