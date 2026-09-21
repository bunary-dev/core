# Changelog

All notable changes to `@bunary/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2026-09-22

API freeze for the 1.0 line. Nothing is published to npm yet; the tag marks the contract. Epic: #61.

### Added

- `createApp()` / `Application`: instance-scoped app with `config`, `env`, `boot()`, `booted`, and a typed token registry (`set`/`get`/`has`); `createToken()`, `Token`; `BunaryError`, `MissingBindingError` (#56)
- Service providers: `Provider` (`register` sync, `boot` async, declaration order, idempotent `boot()`), `defineProvider()`, `createApp({ providers })`, `app.use()` (#57)
- `ConfigRepository` with dot-path `get()`/`has()`/`filled()`/`all()`, typed `ConfigPath` that grows with `BunaryConfig` augmentation, and `defineConfig(schema, values)` accepting any Standard Schema library or a plain function (#58, #41)
- Environment: `resolveEnvironment()`/`environment()` read `APP_ENV`, then `NODE_ENV`, default `development`; unknown values throw. `defineEnv(schema)` validates `Bun.env` once and returns a typed, frozen object (#59)
- `validateWith()`, `ValidationError`, `SchemaLike`, `StandardSchemaV1` re-export; `@standard-schema/spec` is the only runtime dependency (#59)
- `Command`, `CommandArg`, `CommandFlag` types and `commands` on `BunaryConfig` (#40)
- Guards: emitted `.d.ts` must use explicit import extensions (#55); every barrel export must carry a JSDoc `@example` (#50); in-repo example consumer exercising the whole public API (#60); consumer smoke-test workflow on every PR (#51)

### Changed

- `env()` coercion: empty/whitespace values count as unset; booleans are case-insensitive and accept true/false, 1/0, yes/no, on/off; numbers are trimmed (#48)
- `app.debug` defaults from `APP_DEBUG`, falling back to `DEBUG` (#58)
- Relative imports in `src/` carry `.js` extensions so declarations resolve under `moduleResolution: node16` (#55)
- `createConfig()` now returns a `ConfigRepository` snapshot; it never freezes or mutates the caller's object (#58, #47)

### Removed

- **Breaking:** `getBunaryConfig()`, `clearBunaryConfig()`, the `BunaryConfigStore` interface and its `set()`/`clear()`, and deep-freezing of config objects. Build an app with `createApp({ config })` and read `app.config` instead (#58)
- **Breaking:** unknown `app.env` / `NODE_ENV` values no longer fall back to `development`; they throw at `createApp()` (#59)

## [0.3.0] - 2026-09-21

### Changed

- **Requires Bun ≥ 1.4.0** (`engines.bun`); `.bun-version` pins 1.4.2 for CI and contributors (#52)
- Toolchain: `@types/bun` replaces `bun-types`, `typescript` ^7 and `@biomejs/biome` 2.5.1 pinned as devDependencies; `bun.lock` committed (#52)
- `tsconfig.json` aligned with Bun 1.4 `bun init` defaults (`module: Preserve`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`) (#52)
- CI: Bun version read from `.bun-version`, plus a non-required `bun latest` canary job; build job verifies the publish tarball with `bun pm pack --dry-run` (#52)
- Lint now covers `tests/`; coverage thresholds (90% lines/functions) enforced via `bunfig.toml` (#52)

### Fixed

- `exports["."]` now lists `types` before `import` so TypeScript resolves the declarations; added `default` condition and `./package.json` subpath (#49)
- Added `publishConfig.access: public` and `sideEffects: false` (#49)
- Added missing `LICENSE` file (MIT) to the repo and the published tarball (#52)

## [0.2.0] - 2026-02-15

### Added

- `has()` method on `BunaryConfigStore` — check if config is set without try/catch (#36)
- `get()` now returns a deep-frozen `Readonly<BunaryConfig>` to prevent accidental mutation of nested objects (#35)
- Runtime validation: `defineConfig()` throws if `app.name` is not a string, empty, or whitespace-only (#37)
- Tests for module augmentation property passthrough (#38)

### Changed

- Removed duplicated `OrmConfig` type — config extensibility via module augmentation instead
- `defineConfig()` uses spread to pass through augmented properties (e.g. `orm` from `@bunary/orm`)
- `BunaryConfigStore.get()` return type is now `Readonly<BunaryConfig>`

## [0.1.0] - 2026-01-31

### Added

- First minor release — API stable for production use

## [0.0.7] - 2026-01-27

### Fixed

- Added missing `postgres` config shape to `OrmConfig` to match the declared database type union

## [0.0.6] - 2026-01-27

### Changed

- Removed global mutable config and global registry access in favor of an instance-scoped config store (`createConfig()`)
  - This is a breaking change for any consumers relying on global config access.

## [0.0.5] - 2026-01-26

### Changed

- Bumped package version to 0.0.5

## [0.0.4] - 2026-01-26

### Added

- Global registry for cross-package config access (used by `@bunary/orm`)

## [0.0.3] - 2026-01-26

### Added

- `Environment` constant object with `DEVELOPMENT`, `PRODUCTION`, and `TEST` values
- `EnvironmentType` type export for environment type safety

## [0.0.2] - 2026-01-24

### Fixed

- Build now properly generates TypeScript declaration files (`.d.ts`)
- Added `tsconfig.build.json` for declaration-only compilation

## [0.0.1] - 2026-01-24

### Added

- `env(key, defaultValue?)` - Get environment variables with automatic type coercion
  - Supports string, number, and boolean coercion based on default value type
  - Returns `undefined` if variable not set and no default provided
- `isDev()` - Returns `true` when `NODE_ENV` is `"development"` or not set
- `isProd()` - Returns `true` when `NODE_ENV` is `"production"`
- `isTest()` - Returns `true` when `NODE_ENV` is `"test"`
- `defineConfig(config)` - Type-safe configuration helper with defaults
  - Auto-detects `env` from `NODE_ENV` if not specified
  - Auto-detects `debug` from `DEBUG` env var if not specified
- TypeScript types: `BunaryConfig`, `AppConfig`
- Full JSDoc documentation with `@example` blocks
- 100% test coverage

### Technical

- Bun ≥1.0.0 required
- ESM only (`"type": "module"`)
- TypeScript strict mode
- Biome for linting
