import YahooFinance from "yahoo-finance2";

export const yahoo = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});
