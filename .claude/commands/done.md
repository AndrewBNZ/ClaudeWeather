Finish an issue — merge to main, move to Done, close.

$ARGUMENTS format: `#N` — e.g. `#5`

Steps:
1. Parse the issue number from $ARGUMENTS
2. Check out `main` and merge the issue branch (`issue-{N}/*`) into it
3. Move the issue to **Done** using the GraphQL API:
   - Project ID: `PVT_kwHOABJzRs4BSLqi`
   - Status field ID: `PVTSSF_lAHOABJzRs4BSLqizg_yrUg`
   - Done option ID: `de039c60`
4. Close the GitHub issue: `gh issue close {N} --repo AndrewBNZ/ClaudeWeather`
5. Confirm completion — the user will sync to GitHub via VS Code
