Rework an issue based on feedback.

$ARGUMENTS format: `#N <feedback>` — e.g. `#5 the button colour is wrong`

Steps:
1. Parse the issue number and feedback from $ARGUMENTS
2. Check out the existing branch for that issue (pattern: `issue-{N}/*`)
3. Move the issue back to **In Progress** using the GraphQL API:
   - Project ID: `PVT_kwHOABJzRs4BSLqi`
   - Status field ID: `PVTSSF_lAHOABJzRs4BSLqizg_yrUg`
   - In Progress option ID: `b4cc7a92`
4. Apply the rework based on the feedback provided
5. Commit the changes and move the issue to **Review**:
   - Review option ID: `fc23becb`
6. Summarise what was changed
