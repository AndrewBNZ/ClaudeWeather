# ClaudeWeather — Project Instructions

## Kanban Workflow

Issues are tracked on the [GitHub Project board](https://github.com/users/AndrewBNZ/projects/1).

### Shorthands

| Command | Action |
|---------|--------|
| `/next` | Check the board, pick up the next Ready issue |
| `/next #N` | Pick up a specific issue by number |
| `/rework #N` | Send issue #N back to In Progress |
| `/done #N` | Merge branch to main, move to Done, close issue #N |

### Issue Workflow

1. Pick up issue → create branch `issue-{N}/{short-description}`, move to **In Progress**
2. Do the work, commit on the branch
3. Move to **Review**, hand off to user
4. User says `/done #N` → merge to main, move to **Done**, close issue
5. User syncs to GitHub via VS Code

## GitHub

- Repo: `AndrewBNZ/ClaudeWeather`
- Project ID: `PVT_kwHOABJzRs4BSLqi`
- Status field ID: `PVTSSF_lAHOABJzRs4BSLqizg_yrUg`
- Status options:
  - Backlog: `4a1ecb1e`
  - Ready: `433f5635`
  - In Progress: `b4cc7a92`
  - Review: `fc23becb`
  - Done: `de039c60`
