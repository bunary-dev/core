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
const debug = env("DEBUG", false);     // boolean, accepts "TRUE" / "on" / "1"
const name = env("APP_NAME", "myapp"); // string

if (isDev()) {
  console.log("Running in development mode");
}
```

`env()` is for one-off lookups. For the variables an app actually depends on, validate them once at boot with `defineEnv` and read that object instead.

```typescript
import { defineEnv } from "@bunary/core";
import { z } from "zod";

// In bunary.config.ts: a bad .env throws here, at module load.
export const appEnv = defineEnv(
  z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
  }),
);

appEnv.PORT; // number, frozen
```

### The environment name

`development`, `production` or `test`, resolved from `APP_ENV`, then `NODE_ENV`, then `development`. An unrecognised value throws rather than quietly falling back to `development`, so `APP_ENV=prod` fails at boot instead of running production in debug mode.

```typescript
import { createApp, environment, resolveEnvironment } from "@bunary/core";

environment();                 // resolved from the process
resolveEnvironment("test");    // an explicit value wins over both env vars

const app = createApp({ config: { app: { name: "MyApp" } } });
app.env; // config.app.env -> APP_ENV -> NODE_ENV -> "development"
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
- `env` — the environment name this app runs in: `config.app.env`, then `APP_ENV`, then `NODE_ENV`, then `development`. An unknown value throws here.
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

Get an environment variable with optional default and automatic type coercion, driven by the default value's type.

- Empty and whitespace-only values count as unset and return the default.
- Booleans are case-insensitive: `true`/`1`/`yes`/`on` and `false`/`0`/`no`/`off`; anything else returns the default.
- Numbers are trimmed before parsing; `NaN` returns the default.
- Strings are returned verbatim, never trimmed.

### defineEnv\<Output\>(schema, source?): Readonly\<Output\>

Validate the process environment once and return it typed and frozen. `schema` is a Standard Schema object (zod, valibot, arktype) or a plain function that throws on bad input; `source` defaults to `Bun.env`. Throws `ValidationError` listing every offending key. Call it at the top level of `bunary.config.ts` so a bad `.env` fails at boot.

`defineEnv` is deliberately not wired into `createApp`: `app.env` is the environment *name*, not the variables.

### resolveEnvironment(explicit?: string): EnvironmentType

Resolve the environment name: `explicit`, then `APP_ENV`, then `NODE_ENV`, then `development`. Empty and whitespace-only values count as unset. Throws `BunaryError` — `Unknown environment "staging" (expected development, production, test)` — for anything else.

### environment(): EnvironmentType

`resolveEnvironment()` with no explicit value: the environment name resolved from the process, ignoring app config. Prefer `app.env` when you hold an `Application`.

### isDev(): boolean

Returns true if the resolved environment is "development" (including when neither `APP_ENV` nor `NODE_ENV` is set).

### isProd(): boolean

Returns true if the resolved environment is "production".

### isTest(): boolean

Returns true if the resolved environment is "test".

### validateWith\<Input, Output\>(schema, input, context?): Output

Validate a value against a `SchemaLike` — a Standard Schema object or a plain function — synchronously. Failures throw `ValidationError`; a schema whose `validate` returns a promise throws `BunaryError`, because core validates at boot. `context` labels the message, e.g. `"Environment"` or `"Config"`.

### ValidationError

Thrown when a schema rejects its input. Carries `issues: ReadonlyArray<{ path: string; message: string }>` with dot-joined paths (`"(root)"` when the validator gives none), and a message listing them: `Environment validation failed: PORT: Expected number; DATABASE_URL: Required`.

### SchemaLike\<Input, Output\> / StandardSchemaV1

`SchemaLike` is `StandardSchemaV1<Input, Output> | ((input: Input) => Output)`. `StandardSchemaV1` is re-exported from [`@standard-schema/spec`](https://standardschema.dev) — core's only runtime dependency, and a types-only package, so core never bundles a validator.

### defineConfig(config: BunaryConfig): BunaryConfig

Type-safe configuration helper with defaults. Validates `app.name` is a non-empty string (throws for non-string values, empty strings, and whitespace-only strings). Resolves `app.env` through `resolveEnvironment`, so `app.env`, `APP_ENV` or `NODE_ENV` holding an unknown value throws rather than falling back to `development`. Passes through any augmented properties (e.g. `orm` from `@bunary/orm`).

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
