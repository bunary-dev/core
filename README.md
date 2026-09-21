# @bunary/core

Foundation for the Bunary framework: application (createApp, createToken), config (defineConfig, createConfig), environment (defineEnv, env, environment, resolveEnvironment, isDev, isProd, isTest), validation contract (validateWith, ValidationError). Full reference: [docs/index.md](./docs/index.md).

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

export default app;
```

`defineEnv` takes any [Standard Schema](https://standardschema.dev) validator (zod, valibot, arktype) or a plain function — core depends on the spec's types only, never on a validator.

For API details, see [docs/index.md](./docs/index.md).

## License

MIT
