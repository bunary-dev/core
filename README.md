# @bunary/core

Foundation module for the Bunary framework — configuration, environment helpers, and shared utilities.

## Installation

```bash
bun add @bunary/core
```

## Usage

### Environment Variables

```typescript
import { env, isDev, isProd, isTest } from '@bunary/core';

// Get environment variable with automatic type coercion
const port = env('PORT', 3000);        // Returns number
const debug = env('DEBUG', false);     // Returns boolean
const name = env('APP_NAME', 'myapp'); // Returns string

// Environment detection
if (isDev()) {
  console.log('Running in development mode');
}
```

### Configuration

```typescript
import { createConfig, defineConfig } from '@bunary/core';

export const config = createConfig(
  defineConfig({
    app: {
      name: 'MyApp',
      env: 'development',
      debug: true,
    },
  }),
);
```

### Migration note: `getBunaryConfig()`

`getBunaryConfig()` now always throws when called and no longer returns a global config. To migrate, keep a reference to the store returned by `createConfig()` and access your configuration via `store.get()`.

Before:

```ts
const config = getBunaryConfig();
```

After:

```ts
const store = createConfig(defineConfig({ /* ... */ }));
const config = store.get();
```

## API

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

### `createConfig(initial?: BunaryConfig)`

Create an instance-scoped config store with `get()`, `set()`, and `clear()` methods.

## Requirements

- Bun ≥1.0.0

## License

MIT
