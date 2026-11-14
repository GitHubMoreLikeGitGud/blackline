/** What this page itself sent to other computers while something ran. */
export interface NetworkReport {
  supported: boolean;
  offDevice: number;
  hosts: string[];
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const NETWORK_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

/**
 * True when a resource URL went to another computer. Loopback, data: and blob: stay on this
 * computer. A URL that cannot be parsed counts as off-device, so the count never understates.
 */
export function isOffDevice(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (!NETWORK_PROTOCOLS.has(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  return !(LOOPBACK.has(host) || host.endsWith(".localhost"));
}

export function summarize(urls: readonly string[]): Omit<NetworkReport, "supported"> {
  const off = urls.filter(isOffDevice);
  return { offDevice: off.length, hosts: [...new Set(off.map(hostOf))].sort() };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "an unreadable address";
  }
}

/**
 * Starts recording the requests this page starts from now on, using the browser's Resource Timing
 * API. Call the returned function to stop; it returns the same report if called again.
 * The count is a lower bound: entries appear only when a response ends, and requests from embedded
 * frames, workers, or Chrome itself (for example a model download) are not visible to the page.
 */
export function startNetworkWatch(): () => NetworkReport {
  const urls: string[] = [];
  const startedAt = typeof performance === "undefined" ? 0 : performance.now();
  let observer: PerformanceObserver | null = null;
  const collect = (entries: PerformanceEntryList) => {
    for (const entry of entries) {
      if (entry.startTime >= startedAt) urls.push(entry.name);
    }
  };
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes("resource")) throw new Error("no resource timing");
    observer = new PerformanceObserver((list) => collect(list.getEntries()));
    observer.observe({ type: "resource" });
  } catch {
    observer = null;
  }
  let report: NetworkReport | null = null;
  return () => {
    if (report) return report;
    if (observer) {
      collect(observer.takeRecords());
      observer.disconnect();
      report = { supported: true, ...summarize(urls) };
    } else {
      report = { supported: false, offDevice: 0, hosts: [] };
    }
    return report;
  };
}
