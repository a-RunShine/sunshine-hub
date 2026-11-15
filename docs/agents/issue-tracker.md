# Issue tracker: GitHub

本仓库的 issue 和 spec 都存放在 GitHub Issues，所有操作走 `gh` CLI。

## 约定

- **创建**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc。
- **读取**：`gh issue view <number> --json number,title,body,labels,comments`。
- **列出**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label` 和 `--state` 过滤。
- **父子关系**：`gh issue create --parent <parent> ...`，或事后 `gh issue edit <parent> --add-sub-issue <child>`（需 `gh` 2.94+）。旧版本用 `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`。以上都不可用时，在子 issue 正文顶部写 `Part of #<parent>`。
- **阻塞关系**：用 GitHub 原生的 issue 依赖。`gh issue create --blocked-by <n>,<n> ...` 或 `gh issue edit <child> --add-blocked-by <blocker>`（需 `gh` 2.94+）。旧版本用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`，这里的 `<blocker-db-id>` 是阻塞方的数字数据库 id（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`），不是 `#number`，也不是 `node_id`。依赖功能不可用时，在子 issue 正文顶部写 `Blocked by: #<n>, #<n>`。所有阻塞项关闭，ticket 才算解锁。
- **统计未关闭的阻塞**：`gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by`。返回 0 表示可以开工。注意 `gh issue view <n> --json blockedBy` 会把已关闭的也列出来，要自己过滤：`--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`。
- **评论**：`gh issue comment <number> --body "..."`。
- **加标签 / 减标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **关闭**：先用 `gh issue comment` 说明原因，再 `gh issue close <number>`。对已经关闭的 issue，`gh issue close --comment` 会丢掉评论但仍然返回 0，别用它。

仓库从 `git remote -v` 推断，在克隆目录里跑 `gh` 会自动识别。

只往用户自己的仓库提 issue。这个仓库的 owner 是 `a-RunShine`，不是 `mattpocock/skills`。在 fork 里 `gh` 可能默认指向上游父仓库，所以每个会话第一次 `gh issue create` 之前，先用 `gh repo view --json nameWithOwner` 确认目标。

## Pull requests 作为 triage 入口

**PRs as a request surface: no.** 如果本仓库把外部 PR 当作功能请求，改成 `yes`，`/triage` 会读这个开关。

设为 `yes` 时，PR 走和 issue 同一套标签与状态：

- **读取**：`gh pr view <number>`，再看 `gh pr view <number> --comments`（非 TTY 下 `--comments` 只打评论不打正文），diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用一个编号空间，`#42` 可能是其中之一。先用 `gh pr view 42` 试，失败再回退到 `gh issue view 42`。

## skill 说「发布到 issue tracker」时

创建一个 GitHub issue。

## skill 说「取回相关 ticket」时

按上面的**读取**操作。

## Wayfinding 操作

`/wayfinder` 用这套。**map** 是一个 issue，child issue 是 ticket。

- **Map**：一个打了 `wayfinder:map` 标签的 issue，正文装 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`。
- **Child ticket**：挂成 map 的 GitHub sub-issue（见上面的父子关系）。sub-issue 功能不可用时，把 child 加进 map 正文的任务列表，并在 child 正文顶部写 `Part of #<map>`。标签用 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领之后 assign 给推进的人。
- **阻塞**：见上面的阻塞关系。
- **找前沿**：列出 map 下所有未关闭的 child，剔掉有未关闭阻塞的（见统计未关闭的阻塞），再剔掉已经有 assignee 的，按 map 里的顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是本会话的第一次写操作。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，最后把上下文指针（gist 加链接）追加到 map 的 Decisions-so-far。
