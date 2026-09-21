# @bunary/core

Foundation module for the Bunary framework: configuration, environment helpers, and shared utilities.

## Installation

```bash
bun add @bunary/core
```

## Usage

### Environment Variables

```typescript
import { env, isDev, isProd, isTest } from "@bunary/core";

const port = env("PORT", 3000);        // number
const debug = env("DEBUG", false);     // boolean
const name = env("APP_NAME", "myapp"); // string

if (isDev()) {
  console.log("Running in development mode");
}
```

### Configuration

`createConfig()` returns an instance-scoped store, not the resolved config object. Use `configStore.get()` in app code to read the resolved config.

```typescript
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

### Application

```typescript
import { createApp, createToken, MissingBindingError } from "@bunary/core";

const DB = createToken<{ url: string }>("db");

const app = createApp({ config: { app: { name: "MyApp" } } });
app.set(DB, { url: "postgres://localhost/app" });

await app.boot();

app.get(DB).url; // typed as string
```

Two apps created in one process share no config and no bindings.

## API

### createApp(options: CreateAppOptions): Application

Create an instance-scoped application. `options.config` is validated through `defineConfig`, so an invalid config throws here. Returns an unbooted `Application`:

- `config` — this app's `BunaryConfigStore`.
- `env` — the environment this app runs in.
- `set(token, value)` — bind a value to a token; returns the app for chaining. Allowed after boot, but providers should register before boot.
- `get(token)` — read a binding, typed by the token; throws `MissingBindingError` when unset.
- `has(token)` — `true` when a value is bound, even a nullish one.
- `boot()` — idempotent; repeated calls return the same promise and boot runs once.
- `booted` — `true` once `boot()` has completed.

### createToken\<T\>(name: string): Token\<T\>

Create a typed registry key. Identity is the token object, never its name: two `createToken("db")` calls are two distinct keys. `name` is used only in error messages.

### BunaryError

Base class for every error thrown by Bunary; supports the standard `cause` option.

### MissingBindingError

Thrown by `Application.get` when nothing is bound. Carries the offending `token` and the message `No binding registered for token "db"`.

### env\<T\>(key: string, defaultValue?: T): T

Get an environment variable with optional default and automatic type coercion.

### isDev(): boolean

Returns true if NODE_ENV is "development" or not set.

### isProd(): boolean

Returns true if NODE_ENV is "production".

### isTest(): boolean

Returns true if NODE_ENV is "test".

### defineConfig(config: BunaryConfig): BunaryConfig

Type-safe configuration helper with defaults. Validates `app.name` is a non-empty string (throws for non-string values, empty strings, and whitespace-only strings). Passes through any augmented properties (e.g. `orm` from `@bunary/orm`).

### createConfig(config?: BunaryConfig): BunaryConfigStore

Create an instance-scoped configuration store with `get()`, `set()`, `has()`, and `clear()`.

- `get()` returns a deep-frozen `Readonly<BunaryConfig>` — both the top-level object and all nested objects are immutable.
- `has()` returns `true` if config has been set and not cleared.

### Command

Shape of a CLI command; assign to `BunaryConfig.commands` to register project-defined commands.

### CommandArg

A positional argument accepted by a `Command`.

### CommandFlag

A flag (e.g. `--dry-run` / `-d`) accepted by a `Command`.

## Requirements

Bun ≥ 1.4.0

## License

MIT
