# @bunary/core

Foundation module for the Bunary framework — configuration, environment helpers, and shared utilities.

## Installation

```bash
bun add @bunary/core
```

## Quickstart

### Environment variables

```ts
import { env, isDev, isProd, isTest } from "@bunary/core";

const port = env("PORT", 3000); // number
const debug = env("DEBUG", false); // boolean
const name = env("APP_NAME", "myapp"); // string

if (isDev()) {
  console.log("Running in development mode");
}
```

### Configuration

`createConfig()` returns an **instance-scoped store**, not the resolved config object. Most app code should use `configStore.get()` to read the resolved config.

```ts
import { createConfig, defineConfig } from "@bunary/core";

export const configStore = createConfig(
  defineConfig({
    app: {
      name: "MyApp",
      env: "development",
      debug: true,
    },
  }),
);

export default configStore.get();
```

## API reference

### `env<T>(key: string, defaultValue?: T): T`

Get an environment variable with optional default and automatic type coercion.

### `isDev(): boolean`

Returns `true` if `NODE_ENV` is `"development"` or not set.

### `isProd(): boolean`

Returns `true` if `NODE_ENV` is `"production"`.

### `isTest(): boolean`

Returns `true` if `NODE_ENV` is `"test"`.

### `defineConfig(config: BunaryConfig): BunaryConfig`

Type-safe configuration helper with defaults.

### `createConfig(config?: BunaryConfig): BunaryConfigStore`

Create an **instance-scoped** configuration store with `get()`, `set()`, and `clear()`.

## Requirements

- Bun ≥1.0.0

