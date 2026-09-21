/**
 * @bunary/core - Provider Tests
 * TDD: provider lifecycle (#57) - sync register, async boot, declaration order
 */

import { describe, expect, it } from "bun:test";
import { createApp } from "../src/application.js";
import { BunaryError, MissingBindingError } from "../src/errors.js";
import { defineProvider, type Provider } from "../src/provider.js";
import { createToken } from "../src/token.js";

const config = { app: { name: "MyApp" } };

/** Resolves after the current macrotask, so awaiting it really yields. */
const tick = (ms = 1): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe("defineProvider()", () => {
  it("returns the same object it was given", () => {
    const provider: Provider = { name: "noop" };

    expect(defineProvider(provider)).toBe(provider);
  });

  it("keeps the provider's hooks callable", () => {
    const log: string[] = [];
    const provider = defineProvider({
      name: "logger",
      register() {
        log.push("register");
      },
      boot() {
        log.push("boot");
      },
    });

    provider.register?.(createApp({ config }));
    provider.boot?.(createApp({ config }));

    expect(log).toEqual(["register", "boot"]);
  });
});

describe("Application providers", () => {
  it("runs register then boot, both in declaration order", async () => {
    const log: string[] = [];
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "first",
          register: () => {
            log.push("register:first");
          },
          boot: () => {
            log.push("boot:first");
          },
        }),
        defineProvider({
          name: "second",
          register: () => {
            log.push("register:second");
          },
          boot: () => {
            log.push("boot:second");
          },
        }),
        defineProvider({
          name: "third",
          register: () => {
            log.push("register:third");
          },
          boot: () => {
            log.push("boot:third");
          },
        }),
      ],
    });

    await app.boot();

    expect(log).toEqual([
      "register:first",
      "register:second",
      "register:third",
      "boot:first",
      "boot:second",
      "boot:third",
    ]);
  });

  it("runs every register before any boot", async () => {
    const seen: boolean[] = [];
    const token = createToken<string>("late");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "reader",
          boot: (a) => {
            seen.push(a.has(token));
          },
        }),
        defineProvider({
          name: "writer",
          register: (a) => {
            a.set(token, "value");
          },
        }),
      ],
    });

    await app.boot();

    // The reader boots first, but the writer registered before any boot ran.
    expect(seen).toEqual([true]);
  });

  it("passes the app itself to both hooks", async () => {
    const seen: unknown[] = [];
    const app = createApp({
      config,
      providers: [
        defineProvider({
          register: (a) => {
            seen.push(a);
          },
          boot: (a) => {
            seen.push(a);
          },
        }),
      ],
    });

    await app.boot();

    expect(seen).toEqual([app, app]);
  });

  it("awaits each async boot before starting the next", async () => {
    const log: string[] = [];
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "slow",
          boot: async () => {
            log.push("slow:start");
            await tick(5);
            log.push("slow:end");
          },
        }),
        defineProvider({
          name: "fast",
          boot: () => {
            log.push("fast");
          },
        }),
      ],
    });

    await app.boot();

    expect(log).toEqual(["slow:start", "slow:end", "fast"]);
  });

  it("flips booted only after every boot has resolved", async () => {
    const seenDuringBoot: boolean[] = [];
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "slow",
          boot: async (a) => {
            await tick(5);
            seenDuringBoot.push(a.booted);
          },
        }),
        defineProvider({
          name: "last",
          boot: (a) => {
            seenDuringBoot.push(a.booted);
          },
        }),
      ],
    });

    const pending = app.boot();

    expect(app.booted).toBe(false);

    await pending;

    expect(seenDuringBoot).toEqual([false, false]);
    expect(app.booted).toBe(true);
  });

  it("runs providers once across repeated boot() calls", async () => {
    let registers = 0;
    let boots = 0;
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "counter",
          register: () => {
            registers += 1;
          },
          boot: async () => {
            await tick();
            boots += 1;
          },
        }),
      ],
    });

    const first = app.boot();
    const second = app.boot();

    expect(second).toBe(first);

    await Promise.all([first, second, app.boot()]);

    expect(registers).toBe(1);
    expect(boots).toBe(1);
  });

  it("accepts a provider with only register", async () => {
    const token = createToken<string>("only-register");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "register-only",
          register: (a) => {
            a.set(token, "bound");
          },
        }),
      ],
    });

    await app.boot();

    expect(app.get(token)).toBe("bound");
  });

  it("accepts a provider with only boot", async () => {
    let booted = false;
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "boot-only",
          boot: () => {
            booted = true;
          },
        }),
      ],
    });

    await app.boot();

    expect(booted).toBe(true);
  });

  it("accepts a provider with neither hook", async () => {
    const app = createApp({ config, providers: [defineProvider({})] });

    await app.boot();

    expect(app.booted).toBe(true);
  });

  it("boots with no providers option at all", async () => {
    const app = createApp({ config });

    await app.boot();

    expect(app.booted).toBe(true);
  });

  it("ignores later mutation of the providers array", async () => {
    const log: string[] = [];
    const providers: Provider[] = [
      defineProvider({
        name: "declared",
        boot: () => {
          log.push("declared");
        },
      }),
    ];
    const app = createApp({ config, providers });

    providers.push(
      defineProvider({
        name: "sneaked-in",
        boot: () => {
          log.push("sneaked-in");
        },
      }),
    );

    await app.boot();

    expect(log).toEqual(["declared"]);
  });
});

describe("Application provider failures", () => {
  it("rejects with MissingBindingError when a boot reads an unregistered token", async () => {
    const token = createToken<string>("never-bound");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "reader",
          boot: (a) => {
            a.get(token);
          },
        }),
      ],
    });

    const first = app.boot();

    await expect(first).rejects.toBeInstanceOf(MissingBindingError);
    expect(app.booted).toBe(false);

    const second = app.boot();

    expect(second).toBe(first);
    await expect(second).rejects.toBeInstanceOf(MissingBindingError);
    expect(app.booted).toBe(false);
  });

  it("rejects with the original BunaryError, unwrapped", async () => {
    const failure = new BunaryError("boom");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "exploder",
          boot: () => {
            throw failure;
          },
        }),
      ],
    });

    await expect(app.boot()).rejects.toBe(failure);
  });

  it("wraps a non-Bunary boot failure and names the provider", async () => {
    const failure = new TypeError("not a function");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "exploder",
          boot: () => Promise.reject(failure),
        }),
      ],
    });

    try {
      await app.boot();
      expect.unreachable("boot() should have rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(BunaryError);
      const wrapped = error as BunaryError;
      expect(wrapped.message).toContain('provider "exploder"');
      expect(wrapped.message).toContain("boot()");
      expect(wrapped.cause).toBe(failure);
    }

    expect(app.booted).toBe(false);
  });

  it("wraps a non-Bunary register failure and names the provider", async () => {
    const failure = new TypeError("bad register");
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "exploder",
          register: () => {
            throw failure;
          },
        }),
      ],
    });

    try {
      await app.boot();
      expect.unreachable("boot() should have rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(BunaryError);
      const wrapped = error as BunaryError;
      expect(wrapped.message).toContain('provider "exploder"');
      expect(wrapped.message).toContain("register()");
      expect(wrapped.cause).toBe(failure);
    }

    expect(app.booted).toBe(false);
  });

  it("identifies an unnamed failing provider by its index", async () => {
    const app = createApp({
      config,
      providers: [
        defineProvider({ name: "fine" }),
        defineProvider({
          boot: () => {
            throw new TypeError("nope");
          },
        }),
      ],
    });

    await expect(app.boot()).rejects.toThrow("provider at index 1");
  });

  it("throws a BunaryError when a register returns a promise", async () => {
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "async-register",
          register: async () => {
            await tick();
          },
        }),
      ],
    });

    try {
      await app.boot();
      expect.unreachable("boot() should have rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(BunaryError);
      const failure = error as BunaryError;
      expect(failure.message).toContain('provider "async-register"');
      expect(failure.message).toContain("synchronous");
    }

    expect(app.booted).toBe(false);
  });

  it("stops at the first failing register, leaving later ones unrun", async () => {
    let ran = false;
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "exploder",
          register: () => {
            throw new TypeError("nope");
          },
        }),
        defineProvider({
          name: "never",
          register: () => {
            ran = true;
          },
        }),
      ],
    });

    await expect(app.boot()).rejects.toBeInstanceOf(BunaryError);
    expect(ran).toBe(false);
  });

  it("stops at the first failing boot, leaving later ones unrun", async () => {
    let ran = false;
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "exploder",
          boot: () => {
            throw new TypeError("nope");
          },
        }),
        defineProvider({
          name: "never",
          boot: () => {
            ran = true;
          },
        }),
      ],
    });

    await expect(app.boot()).rejects.toBeInstanceOf(BunaryError);
    expect(ran).toBe(false);
  });
});

describe("Application.use()", () => {
  it("appends a provider that then boots in declaration order", async () => {
    const log: string[] = [];
    const app = createApp({
      config,
      providers: [
        defineProvider({
          name: "declared",
          boot: () => {
            log.push("declared");
          },
        }),
      ],
    });

    const returned = app.use(
      defineProvider({
        name: "added",
        register: () => {
          log.push("register:added");
        },
        boot: () => {
          log.push("boot:added");
        },
      }),
    );

    expect(returned).toBe(app);

    await app.boot();

    expect(log).toEqual(["register:added", "declared", "boot:added"]);
  });

  it("works on an app created without a providers option", async () => {
    const token = createToken<string>("used");
    const app = createApp({ config });

    app.use(
      defineProvider({
        register: (a) => {
          a.set(token, "bound");
        },
      }),
    );

    await app.boot();

    expect(app.get(token)).toBe("bound");
  });

  it("throws once boot has started", async () => {
    const app = createApp({ config });
    const pending = app.boot();

    expect(() => app.use(defineProvider({ name: "too-late" }))).toThrow(
      BunaryError,
    );
    expect(() => app.use(defineProvider({ name: "too-late" }))).toThrow(
      "too-late",
    );

    await pending;

    expect(() => app.use(defineProvider({}))).toThrow(BunaryError);
  });
});
