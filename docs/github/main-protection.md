# Main Branch Protection

## Enforced Policy

Configured on 2026-10-23 for the public `ScooballyD/workout` repository:
[Main PR and CI protection](https://github.com/ScooballyD/workout/rules/25725567).

- Active branch ruleset, ID `25725567`, scoped only to `refs/heads/main`.
- Updates require a pull request; direct pushes are not the normal update path.
- Required check: `validate`, from GitHub Actions App ID `15368`.
- The PR must be up to date with main before merging.
- All review conversations must be resolved.
- Branch deletion and non-fast-forward/force pushes are blocked.
- No bypass actors; the authenticated repository administrator reports `current_user_can_bypass: never`.
- Zero approving reviews required, with code-owner and last-push approval requirements disabled, so the sole maintainer can merge their own PR after checks pass.

Administrators can deliberately edit or disable repository rules; an empty
bypass list does not remove their settings authority. Avoid weakening the
policy merely to work around a failed CI run.

The desired API payload is in `main-ruleset.json`. It is documentation, not
an automatically applied infrastructure configuration. Inspect live settings
before updating it and avoid duplicate rulesets.

## Daily Workflow

Push changes to a feature branch, open a PR targeting main, wait for `validate`,
resolve review threads, and merge. If main changes, update the feature branch
and let CI run again. This policy does not require a second person to approve
the PR. It does not itself deploy Android artifacts.

The existing `.github/workflows/ci.yml` installs with `npm ci`, runs TypeScript
checks, and builds the production bundle. It does not currently run unit tests,
dependency auditing, or secret scanning. Requiring its `validate` check does
not add those missing checks or prove that a change is secure. Renaming this
job requires a coordinated update to the required status-check context.

## Verification Evidence

Authenticated GitHub REST API readback confirmed active enforcement, an empty
bypass list, and all four effective rules on main. The branch API returned
`protected: true`; its tip remained
`9c61ebfedc3dca74bc195177c9df9253df9c36f0`.

```powershell
gh api repos/ScooballyD/workout/rulesets/25725567
gh api repos/ScooballyD/workout/rules/branches/main
gh api repos/ScooballyD/workout/branches/main --jq '{name,protected,sha:.commit.sha}'
```

Before the change, no repository/parent rulesets existed and legacy branch
protection returned `Branch not protected`. No unrelated rules were modified.
No app source, workflow, Git commit, branch tip, or release artifact was changed
by this task.

The exact required check was identified from live check-run data, not guessed
from the workflow display name. Existing [PR #4](https://github.com/ScooballyD/workout/pull/4)
merged normally, with a successful `validate` check on its head commit:
[CI job](https://github.com/ScooballyD/workout/actions/runs/36911987760/job/110536613531).
This is historical workflow evidence, not a merge under the new ruleset.

There were no open PRs during configuration. A new end-to-end merge under this
policy remains to be observed on the next ordinary PR; no test commit/PR,
destructive push, bypass attempt, or branch deletion was performed. GitHub
accepted the active policy without an access or plan limitation.

See [GitHub's ruleset API documentation](https://docs.github.com/en/rest/repos/rules)
for rule semantics and current API fields.
