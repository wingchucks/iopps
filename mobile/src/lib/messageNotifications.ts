// Mirrors src/lib/message-notification-retry.ts on the website. After a message
// is saved, ask the website to email the recipient about that one message.
export type MessageNotificationResult = { state: "accepted" | "skipped" | "failed" | "cancelled" };
type Sender = { uid: string; getIdToken(): Promise<string> };
type Dependencies = {
  endpoint: string;
  currentUser(): Sender | null;
  subscribe(listener: (user: Sender | null) => void): () => void;
  fetch?: typeof fetch;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};
type AttemptSignal = { signal: AbortSignal; dispose(): void };

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () => { clearTimeout(timer); reject(new Error("Notification cancelled")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", aborted); resolve(); }, milliseconds);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new Error("Notification attempt cancelled"));
    const cleanup = () => signal.removeEventListener("abort", aborted);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) { cleanup(); aborted(); }
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

// One attempt ends on logout/account switch or after its timeout. React Native has
// no AbortSignal.any or AbortSignal.timeout, so combine the two by hand.
function attemptSignal(session: AbortSignal, milliseconds: number): AttemptSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, milliseconds);
  session.addEventListener("abort", abort, { once: true });
  if (session.aborted) abort();
  return { signal: controller.signal, dispose() { clearTimeout(timer); session.removeEventListener("abort", abort); } };
}

// Retry only the just-saved message. Never retry the Firestore write or scan mail.
// Four attempts, short backoff and request timeouts stay within the server age guard.
export async function notifyNewMessage(messageId: string, senderId: string, dependencies: Dependencies): Promise<MessageNotificationResult> {
  const sender = dependencies.currentUser();
  if (!sender || sender.uid !== senderId) return { state: "cancelled" };
  const session = new AbortController();
  const unsubscribe = dependencies.subscribe(user => { if (user !== sender) session.abort(); });
  const current = () => !session.signal.aborted && dependencies.currentUser() === sender;
  const request = dependencies.fetch || fetch;
  const pause = dependencies.wait || wait;
  try {
    for (const delay of [0, 1000, 3000, 10000]) {
      if (!current()) return { state: "cancelled" };
      let attempt: AttemptSignal | undefined;
      try {
        if (delay) await pause(delay, session.signal);
        if (!current()) return { state: "cancelled" };
        // A setup failure is not transient: retrying could never send a request.
        try { attempt = attemptSignal(session.signal, 10000); } catch { return { state: "failed" }; }
        const token = await abortable(sender.getIdToken(), attempt.signal);
        if (!current()) return { state: "cancelled" };
        const response = await request(dependencies.endpoint, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
          signal: attempt.signal,
        });
        if (!current()) return { state: "cancelled" };
        if (response.ok) {
          const body = await response.json();
          if (!current()) return { state: "cancelled" };
          if (body.notification === "accepted" || body.notification === "skipped") return { state: body.notification };
          if (body.notification !== "busy") return { state: "failed" };
        } else if (response.status !== 429 && response.status < 500) return { state: "failed" };
      } catch {
        if (!current()) return { state: "cancelled" };
        // Timeout, network error or malformed response: same ID safely retries.
      } finally { attempt?.dispose(); }
    }
    return { state: "failed" };
  } finally { unsubscribe(); }
}
