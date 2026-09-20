interface SaveSessionOptions {
  read: () => Promise<boolean>;
  add: () => Promise<void>;
  remove: () => Promise<void>;
  changed: (saved: boolean) => void;
  failed: () => void;
}

/** One job and one authenticated account. Never reuse across identity changes. */
export function createJobSaveSession(options: SaveSessionOptions) {
  let active = true;
  let revision = 0;
  let pending: Promise<boolean> | undefined;
  return {
    async load() {
      if (!active) return;
      const version = revision;
      try {
        const saved = await options.read();
        if (active && version === revision) options.changed(saved);
      } catch {
        // A status read failure must not pretend that a saved job is unsaved.
        if (active && version === revision) options.failed();
      }
    },
    save(remove = false): Promise<boolean> {
      if (!active) return Promise.resolve(false);
      if (pending) return pending;
      revision++;
      pending = (async () => {
        try {
          await (remove ? options.remove() : options.add());
          if (!active) return false;
          options.changed(!remove);
          return true;
        } catch {
          if (active) options.failed();
          return false;
        } finally {
          pending = undefined;
        }
      })();
      return pending;
    },
    dispose() { active = false; },
  };
}
