# @bunary/core — agent instructions

## Definition of done

A PR that changes anything a user of the package can observe (public API,
types, options, defaults, behaviour, error messages) is not done until, in the
same PR:

- `docs/index.md` documents the change: new exports, options and behaviour get
  a section or an updated example; removed or changed behaviour is corrected
  wherever the docs mention it.
- `README.md` is updated if it covers the changed area.
- `CHANGELOG.md` has an entry under `## [Unreleased]` (Breaking / Added /
  Changed / Fixed), ending with the issue number, e.g. `(#12)`. If there is no
  `## [Unreleased]` section yet, add one above the latest release.

Internal-only changes (tests, refactors with no observable effect, CI) need a
CHANGELOG entry only if they fix a user-visible bug.

### Version bump on every shipped change

Every PR that changes `src/` or anything else shipped in the package (the
`files` in `package.json`, its `exports`, `dependencies`) also, in the same PR:

- bumps `version` in `package.json` by semver: patch for fixes, minor for
  features, major for breaking changes. While on a prerelease, bump the
  prerelease number instead: `1.0.0-rc.N` → `1.0.0-rc.N+1` (for example
  `1.0.0-rc.2` → `1.0.0-rc.3`). Before 1.0, breaking changes bump the minor.
- moves its `## [Unreleased]` CHANGELOG entry under a new
  `## [<version>] - YYYY-MM-DD` heading for that version.

Docs-only, test-only and CI-only changes do not bump the version.

Why: the `Tag release on main` workflow tags `v<version>` from `package.json`
on every merge. Without a bump the tag already exists, so the run hits a
duplicate tag (it used to fail; it now skips) and the shipped change never
gets a release tag of its own.

## Out of scope

No npm publishing and no CI/CD or release workflows: publishing for all
`@bunary/*` packages is on hold until the maintainer says otherwise.
