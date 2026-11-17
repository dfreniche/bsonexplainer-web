## Agent rules

- Source of truth for requirements: `specs.md`. This file must be kept in sync whenever the plan or specs change.
- ask anything that's not clear
- Try not to use external dependencies while possible. Justify your picks.
- create a plan document called `plan.md`, maintain it updated with any changes

## Keeping docs current

- If specs change, update the specs.md and plan.md documents

## Versioning & Changesets

This project follows [Semantic Versioning](https://semver.org/). When adding a changeset to a PR, choose the bump type per SemVer.

**Most packages are pre-1.0** (`0.y.z`). SemVer itself says only that "anything may change at any time" for a `0.y.z` line — it doesn't assign meaning to `minor` vs `patch` below `1.0.0`. The following is therefore **Via's own policy** for pre-1.0 packages, not part of the SemVer spec. Apply it to any package still below `1.0.0`:

- **`major`** — do not use. Reserve `major` for the intentional, deliberate move of a package to `1.0.0` (coordinate before doing this).
- **`minor`** — breaking changes only.
- **`patch`** — everything else (new features _and_ bug fixes).

Once a package reaches `1.0.0` or above, use standard SemVer: `major` for breaking changes, `minor` for backward-compatible features, `patch` for backward-compatible fixes.


## Version control

- Everything lives in git (the directory is not a repo yet, so `git init` comes first, as step 0).
- Commit `specs.md` and `plan.md` too, and `.gitignore` must exclude `target/`.
- After each step succeeds (it builds, tests pass, `plan.md` ticked), make one commit for that step, with a short message such as `Step 3: encoder model`.
- If `specs.md` or `plan.md` change outside a step, commit that separately.
- Commit messages carry no attribution lines.