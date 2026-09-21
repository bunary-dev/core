# @bunary/core

Foundation for the Bunary framework: application (createApp, createToken), config (defineConfig, createConfig), environment (env, isDev, isProd, isTest). Full reference: [docs/index.md](./docs/index.md).

## Installation

Requires Bun ≥ 1.4.0.

```bash
bun add @bunary/core
```

## Quick start

```typescript
import { createApp, createToken, env } from "@bunary/core";

const PORT = createToken<number>("port");

const app = createApp({ config: { app: { name: "MyApp", env: "development", debug: true } } });
app.set(PORT, env("PORT", 3000));

await app.boot();

export default app;
```

For API details, see [docs/index.md](./docs/index.md).

## License

MIT
