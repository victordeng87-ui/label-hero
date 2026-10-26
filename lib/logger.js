const STORAGE_KEY = 'label-hero-pending-v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const FIELDS = {
  session_start: ['deviceClass'], pre_quiz_done: ['knowledgeScore', 'selfEfficacy'],
  level_view: ['levelId'], label_opened: ['levelId', 'productIndex', 'msSinceLevelStart'],
  level_pick: ['levelId', 'productIndex', 'productId', 'isBest', 'health', 'price', 'msSpent', 'timedOut'],
  game_done: ['avgHealth', 'budgetLeft'], post_quiz_done: ['knowledgeScore', 'selfEfficacy'], survey_click: []
};
export function anonymousId() { return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''); }

// Whitelisting also applies to restored data, so arbitrary localStorage keys cannot be sent.
export function sanitiseEvent(event) {
  if (!event || !FIELDS[event.event] || !Number.isFinite(Date.parse(event.timestamp))) return null;
  const clean = {};
  for (const key of ['event', 'eventId', 'sessionId', 'timestamp', 'appVersion', ...FIELDS[event.event]]) {
    const value = event[key];
    if (['string','number','boolean'].includes(typeof value) || (key === 'selfEfficacy' && Array.isArray(value) && value.every(n => Number.isInteger(n) && n >= 1 && n <= 5))) clean[key] = value;
  }
  return clean.eventId && clean.sessionId && clean.appVersion ? clean : null;
}

export class EventLogger {
  constructor(config, { storage = globalThis.localStorage, fetcher = globalThis.fetch?.bind(globalThis), now = Date.now, consoleSink = event => console.info('[Label Hero]', event) } = {}) {
    this.config = config; this.storage = storage; this.fetcher = fetcher; this.now = now; this.consoleSink = consoleSink;
    this.enabled = false; this.queue = []; this.busy = false; this.retryTimer = null; this.failures = 0;
    this.onOnline = () => this.flush();
    globalThis.addEventListener?.('online', this.onOnline);
  }
  start(sessionId, consent) {
    this.enabled = consent; this.sessionId = sessionId;
    if (!consent || !this.config.analyticsEndpoint) return;
    try {
      this.queue = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '[]')
        .map(sanitiseEvent).filter(e => e && this.now() - Date.parse(e.timestamp) < MAX_AGE).slice(-1000);
    } catch { this.queue = []; }
  }
  track(event, details = {}) {
    if (!this.enabled) return;
    const clean = sanitiseEvent({ ...details, event, eventId: anonymousId(), sessionId: this.sessionId, timestamp: new Date(this.now()).toISOString(), appVersion: this.config.appVersion });
    if (!clean) return;
    if (!this.config.analyticsEndpoint) { this.consoleSink(clean); return; }
    this.queue.push(clean); this.queue = this.queue.slice(-1000); this.persist(); this.flush();
  }
  persist() { try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.queue)); } catch { /* Memory queue still works when storage is unavailable. */ } }
  async flush() {
    if (!this.enabled || !this.config.analyticsEndpoint || this.busy || !this.queue.length) return;
    clearTimeout(this.retryTimer); this.retryTimer = null; this.busy = true;
    try {
      while (this.enabled && this.queue.length) {
        const event = this.queue[0];
        if (this.now() - Date.parse(event.timestamp) >= MAX_AGE) { this.queue.shift(); this.persist(); continue; }
        const controller = new AbortController(); this.controller = controller;
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await this.fetcher(this.config.analyticsEndpoint, {
            method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), signal: controller.signal, keepalive: true
          });
          if (!response.ok) throw new Error('Endpoint did not acknowledge event');
          // clear() may run while the HTTP request is in flight.
          if (this.queue[0]?.eventId === event.eventId) this.queue.shift();
          this.persist(); this.failures = 0;
        } finally { clearTimeout(timer); this.controller = null; }
      }
    } catch {
      this.failures++;
      if (this.enabled) this.retryTimer = setTimeout(() => this.flush(), Math.min(60000, 1000 * 2 ** Math.min(this.failures, 6)));
    } finally { this.busy = false; }
  }
  clear() {
    this.enabled = false; this.controller?.abort(); clearTimeout(this.retryTimer); this.retryTimer = null; this.queue = [];
    try { this.storage?.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
  }
  destroy() { this.enabled = false; this.controller?.abort(); clearTimeout(this.retryTimer); globalThis.removeEventListener?.('online', this.onOnline); }
}
