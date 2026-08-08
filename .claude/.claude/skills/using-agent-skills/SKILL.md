---
name: using-agent-skills
description: Discover and apply the repository-owned Axios skills that match the current task. Use at the start of work in the Axios monorepo, when the task changes phases, or when the correct local workflow or tool skill is unclear.
---

# Using Agent Skills

## Purpose

Route work to the skills that actually exist in this Axios repository. Treat repository-owned instructions, paths, terminology, and workflows as authoritative.

## Skill locations

Use this precedence when discovering skills:

1. Read repository instructions first: `AGENTS.md`, then any closer `AGENTS.md` files.
2. Use `.agents/skills/<skill-name>/SKILL.md` for the shared Axios skill catalog.
3. Use `.claude/skills/<skill-name>/SKILL.md` for Claude-specific additions or the matching local copy.
4. If a name is not present in one of those directories, do not invoke or recommend it as an Axios skill.

Do not treat copies under `.worktrees/`, `node_modules/`, virtual environments, `tmp/`, or vendored/external skill directories as active repository skills. Re-scan the two active directories when the catalog may have changed.

## Repository orientation

Before non-trivial work:

1. Identify the affected service, library, or shared package.
2. Read the applicable `AGENTS.md` and nearby project guidance.
3. Inspect existing code, tests, conventions, and dependency boundaries.
4. Check the branch and working-tree state before Git operations.
5. Identify the repository commands needed for verification.

Axios-specific constraints include:

- Run services through Tilt; do not start app servers directly.
- Verify downstream consumers when changing shared TypeScript libraries.
- Use the repository’s Jira, ADR, and domain-document conventions.
- Never use `setup-matt-pocock-skills` to reconfigure Axios; its configuration is already complete.

## Routing map

Choose the smallest set of existing skills that covers the current phase.

### Context, onboarding, and uncertainty

- New to the Axios project or setting up an environment: `onboard-me`.
- A Jira, Notion, Figma, or other task reference needs context: `gathering-context`.
- A plan or design needs adversarial questioning: `grilling`, `grill-me`, or `grill-with-docs`.
- Work is too large for one session and needs a decision map: `wayfinder`.

### Product, design, and architecture

- Explore a throwaway design or state-model question: `prototype`.
- Design a deep module, seam, or interface: `codebase-design`.
- Sharpen domain terms, a glossary, or an ADR: `domain-modeling`.
- Find architectural deepening opportunities: `improve-codebase-architecture`.

### Specifications, planning, and tickets

- Synthesize the current conversation into a project spec: `to-spec`.
- Break clear requirements into ordered, verifiable tasks: `planning-and-task-breakdown`.
- Break a plan or spec into tracer-bullet tickets: `to-tickets`.
- Move issues through Axios triage roles: `triage`.
- Create Jira tickets after decomposition: load `to-tickets`, then `jira-ticketing`; load `use-jira` before Jira access.

### Research and source verification

- Investigate external libraries or frameworks with current documentation: `external-scout`.
- Ground implementation decisions in official documentation: `source-driven-development`.
- Research a question against primary sources and save findings: `research`.

### Implementation and testing

- Implement work described by a spec or tickets: `implement`.
- Work test-first or build integration tests: `tdd`.
- Write Go integration tests for Axios services: `go-integration-test-creator`.
- Write maintained Axios Playwright E2E tests: `writing-playwright-e2e-tests`.
- Manually verify or debug an already-running Axios UI: `using-playwright-cli`.
- Inspect ad tech, analytics, consent, or ad rendering: `ad-analytics-inspector`.

### Diagnosis, review, and Git

- Diagnose a bug, failure, or performance regression: `diagnosing-bugs`.
- Review changes against repository standards and the originating spec: `code-review`.
- Resolve an in-progress merge or rebase conflict: `resolving-merge-conflicts`.
- Create a conventional commit: `commit`.
- Split a large branch or PR into smaller stacked PRs: `split-to-prs`.
- Open or update a draft pull request: `pull-request`; load `use-github` before GitHub operations.

### External tools and delivery

- GitHub PRs, issues, releases, or review comments: `use-github`.
- Jira tickets or sprints: `use-jira`.
- Notion documents or workspace queries: `use-notion`.
- Figma files, nodes, CSS, or variables: `use-figma`.
- Xray test cases or folders: `use-xray`.
- Author Xray test-case specifications: `writing-xray-test-cases`.
- Hand work to another agent: `handoff`.
- Teach a concept within the workspace: `teach`.
- Write or edit a skill: `writing-great-skills`.

## Composition examples

Use only the phases that apply. A typical feature can progress through `gathering-context`, `to-spec`, `planning-and-task-breakdown`, `implement`, `tdd`, `code-review`, `commit`, and `pull-request`. A defect can progress through `diagnosing-bugs`, `tdd`, `implement`, and `code-review`. A documentation-sensitive change can use `external-scout`, `source-driven-development`, and `implement`.

For Jira delivery, use `to-tickets` followed by `jira-ticketing`, with `use-jira` loaded before reading or writing Jira.

## Operating rules

1. Prefer repository evidence over generic workflow advice.
2. State material assumptions about compatibility, scope, or architecture.
3. Resolve minor ambiguity from existing conventions; ask only when the choice materially changes behavior or risk.
4. Push back on data loss, security exposure, compatibility breaks, unnecessary coupling, or unjustified scope.
5. Keep changes surgical. Do not refactor unrelated code, edit generated or vendored files, or add speculative features.
6. Preserve public API, schema, event, serialization, ordering, default, and side-effect behavior unless the task explicitly changes it.
7. Verify with evidence: run the narrowest relevant tests first, then expand to affected services and downstream consumers.
8. Report what passed, failed, was skipped, and any remaining risk.

## Definition of done

Use the repository’s definition of done when one exists. Otherwise, finish only when the requested behavior is implemented, relevant tests and applicable build/lint/type checks pass, runtime behavior is verified when practical, compatibility and documentation concerns are addressed, and the final diff contains no unrelated changes.

Do not claim completion from inspection alone.
