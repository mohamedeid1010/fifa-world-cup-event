# ⚽ FIFA World Cup Event
### Team Collaboration Guide & Git Workflow

---

## 📋 About This Project

This document is the complete collaboration and workflow reference for the FIFA World Cup Event project. It covers environment setup, Git branching strategy, daily development routine, and best practices every team member must follow.

---

## 🚀 Quick Start — First Time Setup

Run these commands **once** when you first join the project:

```bash
git clone https://github.com/mohamedeid1010/fifa-world-cup-event.git
cd fifa-world-cup-event
git checkout dev
git pull origin dev
npm install
npm run dev
```

| Command | What It Does |
|---|---|
| `git clone ...` | Downloads the repository to your machine |
| `cd fifa-world-cup-event` | Navigates into the project folder |
| `git checkout dev` | Switches to the shared team development branch |
| `git pull origin dev` | Downloads the latest team updates from `dev` |
| `npm install` | Installs all required dependencies |
| `npm run dev` | Starts the dev server (usually at `localhost:5173`) |

---

## 🌿 Branch Strategy

The project uses **three levels of branches**. Each has a strict purpose:

| Branch | Who Uses It | Purpose |
|---|---|---|
| `main` | Team Lead only | Final stable release — **DO NOT touch directly** |
| `dev` | All team members | Ongoing team work — base for all features |
| `feature/...` | Individual devs | Your personal task branch |

### Current Repository Setup

- `main` is the stable branch.
- `dev` has already been created and pushed to GitHub.
- Every new task should start from `dev`, then move into a `feature/...` branch.

---

## 📅 Daily Development Workflow

Follow these steps **every single time** you start working on a new task:

### Step 1 — Pull the Latest Updates

Always sync with the team before starting. This prevents conflicts.

```bash
git checkout dev
git pull origin dev
```

### Step 2 — Create Your Feature Branch

Each task gets its own branch. **Never work directly on `dev`.**

```bash
git checkout -b feature/your-task-name
```

> **Branch naming examples:**
> - `feature/navbar`
> - `feature/teams-page`
> - `feature/match-schedule`
> - `feature/footer-design`

### Step 3 — Do Your Work

Open VS Code, edit your files, and build your feature. No special commands needed during this step.

### Step 4 — Save & Upload Your Work

```bash
git status                         # See your changes
git add .                          # Stage all changes
git commit -m "add navbar design"  # Save with a message
git push -u origin feature/navbar  # Upload to GitHub
```

| Command | What It Does |
|---|---|
| `git status` | Shows which files you changed |
| `git add .` | Stages all modified files for commit |
| `git commit -m "..."` | Saves a snapshot with a description |
| `git push -u origin ...` | Uploads your branch to GitHub |

### Step 5 — Open a Pull Request

After pushing, go to GitHub and follow these steps:

1. Click the **"Compare & Pull Request"** button
2. Set **source** → `feature/your-branch`
3. Set **target** → `dev`
4. Write a clear title and description of what you built
5. Click **"Create Pull Request"**

---

## ⚠️ Common Mistakes — Avoid These

```
❌  Never commit directly to main or dev
❌  Never skip `git pull` before starting a new task — causes merge conflicts
❌  Never delete or overwrite another team member's files
❌  Never push untested broken code — always run `npm run dev` first
✅  Always create a new branch per task — one branch = one feature
```

---

## ⚡ Daily Quick Reference

Copy and paste this every time you start a new session:

```bash
# Start of day — always do this first
git checkout dev
git pull origin dev
git checkout -b feature/my-new-task

# End of session — save and upload
git status
git add .
git commit -m "describe what you did"
git push -u origin feature/my-new-task
```

---

## 🗺️ The Big Picture

| # | Stage | What Happens |
|---|---|---|
| 1 | Individual Work | Each developer works on their own `feature/*` branch |
| 2 | Merge to dev | PR is reviewed and merged into the shared `dev` branch |
| 3 | Team Testing | Team tests the combined work on `dev` and fixes issues |
| 4 | Release | When stable, team lead merges `dev` → `main` for final release |

---

*FIFA World Cup Event Project — Team Collaboration Guide*
