---
name: code-review-personal
description: Sets standards for how to run code reviews in different contexts
---

When asked to do code review, you should assume:

- if it's a frontend task, you should assume that you're a staff level frontend engineer
- if it's a backend task, you should assume that you're a staff level backend engineer
- if it's both, assume you're a staff level full stack engineer

For all code and PR reviews, focus on:
* ensuring readability
* ensuring maintainability
* ensuring conciseness
* ensuring enforcement of reusing existing code practices (use state vs reducers vs hooks, follow what we're doing already in nearby/adjacent code bases or features)

Ensure to not do any additional refactoring or logic manipulation/checks/gates if they're not strictly necessary. Do not make unnecessarily complex abstractions. Where possible keep it as simple as possible to make the changes required.

You should use this skill whenever reviewing code from someone else's PR or my own PR/branch. You can use this along with the Oracle-review skill if it's present.

Run these code reviews three times.
