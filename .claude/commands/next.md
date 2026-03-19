Pick up the next issue from the GitHub project board.

If $ARGUMENTS is provided (e.g. `#5`), pick up that specific issue number.
Otherwise, query the board for the next **Ready** issue and pick it up.

Steps:
1. Use `gh` to find the issue (either the specified one or the next Ready issue on project `PVT_kwHOABJzRs4BSLqi` for repo `AndrewBNZ/ClaudeWeather`)
2. Move it to **In Progress** using the GraphQL API:
   - Project ID: `PVT_kwHOABJzRs4BSLqi`
   - Status field ID: `PVTSSF_lAHOABJzRs4BSLqizg_yrUg`
   - In Progress option ID: `b4cc7a92`
3. Create a branch named `issue-{N}/{short-description}` and check it out
4. Summarise the issue and confirm you're ready to start work
