# Changelog

All notable changes to `@bunary/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
