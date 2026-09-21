# @bunary/core

Foundation for the Bunary framework: application (createApp, createToken), config (defineConfig, createConfig, ConfigRepository), environment (defineEnv, env, environment, resolveEnvironment, isDev, isProd, isTest), validation contract (validateWith, ValidationError). Full reference: [docs/index.md](./docs/index.md).

## Installation

Requires Bun ≥ 1.4.0.

```bash
bun add @bunary/core
```

## Quick start

```typescript
import { createApp, createToken, defineEnv } from "@bunary/core";
import { z } from "zod";

// Fails at module load if the process environment is wrong.
const appEnv = defineEnv(z.object({ PORT: z.coerce.number().default(3000) }));

const PORT = createToken<number>("port");

const app = createApp({ config: { app: { name: "MyApp", debug: true } } });
app.set(PORT, appEnv.PORT);

await app.boot();

app.env; // APP_ENV -> NODE_ENV -> "development"
app.config.get("app.name"); // dot-path reads, plus has() and filled()

export default app;
```

`defineEnv` takes any [Standard Schema](https://standardschema.dev) validator (zod, valibot, arktype) or a plain function — core depends on the spec's types only, never on a validator.

For API details, see [docs/index.md](./docs/index.md).

## Providers

A provider is a plain object with two optional hooks. `register` is synchronous and only binds tokens; `boot` may be async and may read them. `app.boot()` runs every `register` in declaration order, then every `boot` in declaration order, awaiting each one.

```typescript
import { createApp, createToken, defineProvider } from "@bunary/core";

const DB = createToken<{ url: string }>("db");

const databaseProvider = defineProvider({
  name: "database",
  register(app) {
    app.set(DB, { url: Bun.env.DATABASE_URL ?? "postgres://localhost/app" });
  },
  async boot(app) {
    await Promise.resolve(app.get(DB).url); // connect, migrate, warm caches
  },
});

const app = createApp({
  config: { app: { name: "MyApp" } },
  providers: [databaseProvider],
});

await app.boot(); // register:database, then boot:database
```

No dependency graph: ordering is the array you wrote. See [docs/index.md](./docs/index.md) for `Application.use()` and the failure semantics.

## License

MIT
