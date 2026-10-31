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

## Out of scope

No npm publishing and no CI/CD or release workflows: publishing for all
`@bunary/*` packages is on hold until the maintainer says otherwise.
