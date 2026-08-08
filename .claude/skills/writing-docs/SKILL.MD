---
name: writing-docs
description: Guidelines on what to do when writing documentation documents including explanations, context, etc.
---

Always ensure that we're writing out actual tmp files to ~/tmp, if it's truly temporary write to ~/.tmp and then delete the files after generating the final document. The final document should appear in one of the directories in ~/tmp, depending on the kind of document it is. Example, if I ask to summarize a PR, the summary should be put into ./tmp/pr-reviews with an easy to read name along with the PR number. If I ask to summarize a documentation/architectural desgn record or investigation document it should be put into ./tmp/adrs for ADRs, ./tmp/context-guides/ for summarizing investigaton documents or planned feature/architecture changes.
