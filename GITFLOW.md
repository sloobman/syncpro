# GitFlow & Release Guidelines for SyncPro

This document defines the branching strategy and automated release rules for the project.

---

## Branching Model

| Branch | Environment | Auto-Deploy | Description |
| :--- | :--- | :--- | :--- |
| **`main`** | **Production VPS** | **YES (CD)** | Production branch. Mirrors the running VPS at `144.31.192.179`. Direct commits are prohibited. |
| **`dev`** | **Development** | No | Integration branch for ongoing work. Tested by CI. |
| **`feature/*`** | Local / Staging | No | Working branches for tasks. Created from `dev` and merged back into `dev`. |
| **`fix/*`** | Local / Staging | No | Bugfix branches. Created from `dev` and merged back into `dev`. |

---

## Standard Workflow for Agents and Developers

### Step 1: Start from `dev`
Always ensure your base is up to date:
```bash
git checkout dev
git pull origin dev
git checkout -b feature/<task-name>
```

### Step 2: Implement & Validate
Run checks locally before making commits:
```bash
# Frontend validation
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

### Step 3: Merge into `dev`
Once verified, merge into the development branch:
```bash
git checkout dev
git pull origin dev
git merge --no-ff feature/<task-name>
git push origin dev
```
*GitHub Actions runs `.github/workflows/ci.yml` (ESLint, Typecheck, Build, Docker config check).*

### Step 4: Promote to Production (`main`)
When `dev` is validated and ready for deployment:
```bash
git checkout main
git pull origin main
git merge --no-ff dev -m "chore(release): promote dev to production"
git push origin main
```
*GitHub Actions automatically runs `.github/workflows/cd.yml` which deploys the code live to the VPS.*
