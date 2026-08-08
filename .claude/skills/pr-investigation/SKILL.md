---
name: pr-investigation
description: Investigate the context required to understand and plan work associated with a pull request, branch, issue, or linked Jira ticket. Use before planning or implementing PR-related work. Gather relevant PR, repository, issue-tracker, discussion, history, dependency, and external documentation context; invoke focused context or research skills when useful; surface conflicts and unknowns; and hand the evidence to the existing planning workflow. Do not prescribe code structure, implementation methodology, repository conventions, or plan format.
---

# PR Investigation

Investigate the requested change before planning or implementation.

Follow all repository instructions and conventions already in effect. Do not
introduce a new architecture, coding methodology, testing philosophy, task
format, or repository structure.

## Identify the work

Resolve the available references:

- Pull request
- Repository and source branch
- Base branch
- Linked issue
- Jira ticket
- User-provided requirement

Use available tools to retrieve context instead of asking the user for
information that can be obtained directly.

Look for issue or Jira references in:

- PR title and description
- Branch name
- Commit messages
- Linked issues
- Review discussion

Use Jira when:

- A Jira ticket is directly linked or clearly referenced, and
- Its contents are likely to clarify requirements, scope, decisions, or
  acceptance criteria, and
- Jira access is available.

Do not require Jira when it is unavailable or irrelevant.

## Gather focused context

Inspect only information that could materially change the understanding or
eventual plan.

As applicable, inspect:

- PR title and description
- Diff against the actual base branch
- Changed files
- Commits and commit messages
- Review comments and requested changes
- General PR discussion
- CI checks and failures
- Linked issues
- Relevant Jira content
- Repository instructions and documentation
- Existing implementation
- Nearby examples and related call paths
- Tests demonstrating current behavior
- Dependency manifests and lockfiles
- Relevant git history or blame when intent is unclear

Do not gather information solely because it is available.

## Use supporting skills

Load `context-engineering` when repository, tool, historical, or documentation
context needs to be identified or narrowed.

Load `source-driven-development` when a conclusion depends on:

- Current framework or library behavior
- Installed dependency versions
- Recently changed APIs
- Deprecations
- Security recommendations
- External protocols, standards, or services

Load `using-agent-skills` when a specialized available skill could materially
improve a specific part of the investigation.

Use the minimum sufficient skill set. Do not automatically load implementation,
architecture, testing, migration, or review skills.

## Research external information

Before researching version-sensitive behavior:

1. Determine the relevant version used by the repository.
2. Prefer official documentation for that version.
3. Prefer official specifications, release notes, migration guides, and
   maintainer repositories.
4. Use reputable secondary sources only when primary sources are insufficient.
5. Record which conclusions were externally verified.
6. Mark conclusions that could not be verified.

Do not browse for stable facts when repository evidence is sufficient.

## Reconcile evidence

Compare the available evidence without assuming any one source is complete.

Look for:

- Ticket requirements missing from the PR
- PR descriptions that do not match the current diff
- Review requests not addressed by the branch
- Conflicting or ambiguous acceptance criteria
- Existing behavior that constrains the change
- Stale or version-incompatible external guidance
- Missing permissions or unavailable sources

Classify material conclusions as:

- Confirmed
- Inferred
- Conflicting
- Unknown

Do not resolve genuine requirement conflicts by guessing.

## Return the investigation

Provide a concise investigation brief containing:

### Requested change

The apparent goal of the work.

### Relevant findings

Facts from the PR, repository, issue tracker, discussion, history, and external
research that could materially affect planning.

Include file paths, symbols, references, and links where useful.

### Existing state

What the current repository or PR already does.

### Gaps and conflicts

Incomplete, contradictory, stale, inaccessible, or unknown information.

### Planning considerations

Facts and constraints the normal planning workflow should account for.

Do not prescribe an implementation approach unless the gathered evidence makes
another approach impractical.

### Sources consulted

The important PR, repository, issue-tracker, history, and external sources used.

### Handoff

Pass the gathered evidence to the existing planning workflow.

Load `planning-and-task-breakdown` only when it is installed and the user asks
for an implementation plan, or when existing instructions explicitly require it.

## Boundaries

- Do not modify production code.
- Do not modify the PR or issue tracker.
- Do not prescribe code organization.
- Do not override CLAUDE.md, AGENTS.md, CONTRIBUTING.md, or repository rules.
- Do not mandate a particular plan structure.
- Do not create planning files unless the existing workflow requests them.
- Do not propose unrelated refactors.
- Do not manufacture requirements.
