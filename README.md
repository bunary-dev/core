# @bunary/core

Foundation for the Bunary framework: config (defineConfig, createConfig), environment (env, isDev, isProd, isTest). Full reference: [docs/index.md](./docs/index.md).

## Installation

```bash
bun add @bunary/core
```

## Quick start

```typescript
import { env, createConfig, defineConfig } from "@bunary/core";

const port = env("PORT", 3000);
const configStore = createConfig(defineConfig({ app: { name: "MyApp", env: "development", debug: true } }));
export default configStore.get();
```

For API details, see [docs/index.md](./docs/index.md).

## License

MIT
