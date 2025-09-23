---
title: "Git Cheat Sheet: Essential Commands for Developers"
description: "A comprehensive Git command cheat sheet for developers. Learn the most important Git commands for daily workflow, version control, and collaboration. Perfect for beginners and advanced users."
pubDate: 2025-09-23
author: "ptminh-kmp"
tags: ["git", "cheat sheet", "version control", "developer", "guide"]
seo:
  title: "Git Cheat Sheet: Essential Commands for Developers"
  description: "Master Git with this developer-friendly cheat sheet! Learn key Git commands for version control, branching, merging, and more."
---

# Git Cheat Sheet: Essential Commands for Developers

Git is the most popular version control system for developers. Whether you’re just starting or need a quick reference, this cheat sheet covers the most important Git commands for your daily workflow.

## Table of Contents

- [Getting Started](#getting-started)
- [Working with Repositories](#working-with-repositories)
- [Branching & Merging](#branching--merging)
- [Staging & Committing](#staging--committing)
- [Viewing History](#viewing-history)
- [Remote Repositories](#remote-repositories)
- [Undoing Changes](#undoing-changes)
- [Advanced Tips](#advanced-tips)
- [Resources](#resources)

---

## Getting Started

```bash
# Configure your name and email
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Initialize a new repository
git init

# Clone a repository
git clone https://github.com/user/repo.git
```

## Working with Repositories

```bash
# Check repository status
git status

# List files being tracked
git ls-files
```

## Branching & Merging

```bash
# List branches
git branch

# Create a new branch
git branch feature-branch

# Switch to a branch
git checkout feature-branch

# Create and switch to a new branch
git checkout -b new-feature

# Merge a branch into current branch
git merge feature-branch

# Delete a branch
git branch -d feature-branch
```

## Staging & Committing

```bash
# Stage changes
git add file.txt

# Stage all changes
git add .

# Commit changes with message
git commit -m "Your commit message"
```

## Viewing History

```bash
# Show commit history
git log

# One-line summary of commits
git log --oneline

# View changes in files
git diff

# Show who changed each line
git blame file.txt
```

## Remote Repositories

```bash
# Add remote repository
git remote add origin https://github.com/user/repo.git

# Push changes to remote
git push origin main

# Pull changes from remote
git pull origin main

# Fetch changes without merging
git fetch origin
```

## Undoing Changes

```bash
# Unstage a file
git reset file.txt

# Revert file to last commit
git checkout -- file.txt

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

## Advanced Tips

```bash
# Stash changes (save work without committing)
git stash

# Apply last stashed changes
git stash apply

# Show remote URLs
git remote -v

# Show details of a branch
git show-branch branch-name
```

---

## Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [Pro Git Book](https://git-scm.com/book/en/v2)
- [GitHub Guides](https://guides.github.com/)

---

> _Tip: Bookmark this page for quick access to Git commands anytime!_

---

## Frequently Asked Questions

### What is Git?

Git is a distributed version control system for tracking changes in source code during software development.

### Why should I use Git?

Git enables collaboration, version tracking, and easy management of codebases for projects of any size.

### How do I resolve merge conflicts?

Edit the files to fix conflicts, then add and commit the resolved files:
```bash
git add conflicted-file.txt
git commit
```

---

## Conclusion

With this cheat sheet, you have the essential Git commands at your fingertips. Whether you’re working solo or with a team, Git streamlines your workflow and keeps your code organized.

---