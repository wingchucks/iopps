/**
 * Same cases as tests/message-notification-retry.test.mjs for the website,
 * run against the phone app's copy (React Native has no AbortSignal.any).
 */
import { notifyNewMessage } from "../lib/messageNotifications";

const ENDPOINT = "https://www.iopps.ca/api/messages/notify";
type Reply = { status?: number; notification?: string } | Error;
type FetchOptions = { method: string; headers: Record<string, string>; body: string; signal: AbortSignal };

function harness(responses: Reply[] = [{ notification: "accepted" }]) {
  const sender = { uid: "sender", getIdToken: async () => "fictional-token" };
  let user: { uid: string; getIdToken(): Promise<string> } | null = sender;
  let listener: ((value: typeof user) => void) | undefined;
  let unsubscribed = 0;
  const requests: { url: string; options: FetchOptions }[] = [];
  const delays: number[] = [];
  const dependencies = {
    endpoint: ENDPOINT,
    currentUser: () => user,
    subscribe: (callback: (value: typeof user) => void) => {
      listener = callback;
      return () => {
        unsubscribed++;
        listener = undefined;
      };
    },
    wait: async (milliseconds: number, signal: AbortSignal) => {
      delays.push(milliseconds);
      if (signal.aborted) throw new Error("cancelled");
    },
    fetch: (async (url: string, options: FetchOptions) => {
      requests.push({ url, options });
      const next = responses[Math.min(requests.length - 1, responses.length - 1)];
      if (next instanceof Error) throw next;
      const status = next.status || 200;
      return { ok: status >= 200 && status < 300, status, json: async () => next };
    }) as unknown as typeof fetch,
  };
  return {
    sender,
    requests,
    delays,
    dependencies,
    change(value: typeof user) {
      user = value;
      listener?.(value);
    },
    get unsubscribed() {
      return unsubscribed;
    },
    run: () => notifyNewMessage("just-saved-message", "sender", dependencies),
  };
}

it("retries a transient provider or network failure for the same message and confirms acceptance", async () => {
  const h = harness([{ status: 503 }, new Error("Network failed"), { notification: "accepted" }]);
  await expect(h.run()).resolves.toEqual({ state: "accepted" });
  expect(h.delays).toEqual([1000, 3000]);
  expect(h.requests).toHaveLength(3);
  for (const { url, options } of h.requests) {
    expect(url).toBe(ENDPOINT);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ messageId: "just-saved-message" });
    expect(options.headers.Authorization).toBe("Bearer fictional-token");
  }
  expect(h.unsubscribed).toBe(1);
});

it("stops on permanent authorization or input errors without another request", async () => {
  for (const status of [400, 401, 403, 404]) {
    const h = harness([{ status }]);
    await expect(h.run()).resolves.toEqual({ state: "failed" });
    expect(h.requests).toHaveLength(1);
    expect(h.delays).toEqual([]);
    expect(h.unsubscribed).toBe(1);
  }
});

it("gives up after four bounded attempts", async () => {
  const h = harness([{ status: 503 }]);
  await expect(h.run()).resolves.toEqual({ state: "failed" });
  expect(h.requests).toHaveLength(4);
  expect(h.delays).toEqual([1000, 3000, 10000]);
  expect(h.unsubscribed).toBe(1);
});

it("retries a busy lease or rate limit; skipped stops; legacy and expired never claim acceptance", async () => {
  const h = harness([{ notification: "busy" }, { status: 429 }, { notification: "accepted" }]);
  await expect(h.run()).resolves.toEqual({ state: "accepted" });
  for (const [notification, state] of [["skipped", "skipped"], ["legacy_queued", "failed"], ["expired", "failed"], ["unknown", "failed"]]) {
    const single = harness([{ notification }]);
    await expect(single.run()).resolves.toEqual({ state });
    expect(single.requests).toHaveLength(1);
  }
});

it("cancels every later request when the member signs out or switches accounts during backoff", async () => {
  for (const next of [null, { uid: "different", getIdToken: async () => "other" }, { uid: "sender", getIdToken: async () => "relogin" }]) {
    const h = harness([{ status: 503 }]);
    h.dependencies.wait = async () => {
      h.change(next);
    };
    await expect(h.run()).resolves.toEqual({ state: "cancelled" });
    expect(h.requests).toHaveLength(1);
    expect(h.unsubscribed).toBe(1);
  }
});

it("never sends either account's token when the account changes while a token is loading", async () => {
  const h = harness();
  h.sender.getIdToken = () => new Promise<string>(() => {});
  const pending = h.run();
  h.change({ uid: "different", getIdToken: async () => "different-token" });
  await expect(pending).resolves.toEqual({ state: "cancelled" });
  expect(h.requests).toHaveLength(0);
  expect(h.unsubscribed).toBe(1);
});

it("aborts an in-flight request on sign-out without retrying for the next account", async () => {
  const h = harness();
  let started: () => void = () => {};
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  h.dependencies.fetch = (async (_url: string, options: FetchOptions) => {
    started();
    return new Promise((_resolve, reject) =>
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })
    );
  }) as unknown as typeof fetch;
  const pending = h.run();
  await requestStarted;
  h.change(null);
  await expect(pending).resolves.toEqual({ state: "cancelled" });
  expect(h.delays).toEqual([]);
  expect(h.unsubscribed).toBe(1);
});

it("times out a hung attempt and retries the same message", async () => {
  jest.useFakeTimers();
  try {
    const h = harness([{ notification: "accepted" }]);
    const respond = h.dependencies.fetch;
    let attempts = 0;
    let started: () => void = () => {};
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    h.dependencies.fetch = (async (url: string, options: FetchOptions) => {
      if (attempts++) return respond(url, options as unknown as RequestInit);
      started();
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () => reject(new Error("timed out")), { once: true })
      );
    }) as unknown as typeof fetch;
    const pending = h.run();
    await requestStarted;
    jest.advanceTimersByTime(10000);
    await expect(pending).resolves.toEqual({ state: "accepted" });
    expect(attempts).toBe(2);
    expect(h.delays).toEqual([1000]);
  } finally {
    jest.useRealTimers();
  }
});

it("never starts for another sender or when nobody is signed in", async () => {
  const h = harness();
  await expect(notifyNewMessage("just-saved-message", "stranger", h.dependencies)).resolves.toEqual({ state: "cancelled" });
  h.change(null);
  await expect(h.run()).resolves.toEqual({ state: "cancelled" });
  expect(h.requests).toHaveLength(0);
});
