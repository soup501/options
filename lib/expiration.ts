export function formatExpirationDate(value: string | number) {
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntilExpiration(value: string | number) {
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  const expirationDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const today = new Date();
  const todayDay = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.max(0, Math.round((expirationDay - todayDay) / 86400000));
}
