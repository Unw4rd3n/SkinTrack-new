type AnalyticsEvent = {
  name: string;
  payload?: Record<string, unknown>;
  ts: number;
};

const events: AnalyticsEvent[] = [];

export function trackEvent(name: string, payload?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    name,
    payload,
    ts: Date.now(),
  };

  events.push(event);

  if (__DEV__) {
    // Local analytics stub for beta instrumentation.
    console.log('[analytics]', event.name, event.payload ?? {});
  }
}

export function getAnalyticsSnapshot(limit = 100) {
  return events.slice(-limit);
}
