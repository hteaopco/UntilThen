# Git workflow

Always commit and push directly to `main`. Do not create feature branches.

- Every change goes straight to `main` so Railway auto-deploys
  immediately without any manual merges.
- If the session was started on a feature branch, switch to `main`
  first, merge/rebase the work in, and push `main`.
- Empty commits are fine (and sometimes necessary) to force a
  Railway rebuild: `git commit --allow-empty -m "..."`.
