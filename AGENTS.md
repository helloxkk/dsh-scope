# dsh-scope — 插件开发指南

上级目录 [`../AGENTS.md`](../AGENTS.md) 讲 harness 共性（环境事实、热重载规则、调试端点、通用坑）。本文件只讲**这个插件自己的实现**，两者叠加生效。

## 这是什么

两个功能，一个插件：

1. **使用统计**（侧边栏底部）— 生命周期摘要条、52 周 Token 活动热力图（每日/每周/累计三种模式）、按模型日趋势折线、模型用量环形图、DeepSeek 余额页
2. **Context Lens**（会话头部）— 实时窗口占用率、system/tools/messages 构成条、KV 缓存命中率

## 目录结构

```
src/
  index.js          宿主半：两个回环端点 + 会话日志折算
  usage.js          纯函数折算逻辑（无 React，可单测）
  client/
    index.js        客户端入口：注册 slot
    AppUsagePanel.jsx    使用统计页面（视图层）
    statsModel.js        派生逻辑（窗口化/分桶/排序，无 React，可单测）
    BalancePanel.jsx     余额页面
    ContextLens.jsx      会话头部透镜
    UsageStats.jsx       侧边栏触发器 + 面板外壳 + 页签 + 高度锁
    useRemote.js         共享数据加载 hook
    statsFormat.js       数字/日期/货币格式化
    locales.js           中英字典（必须同步）
    style.js             全部 CSS（模板字符串）
scripts/
  install.mjs        安装到 profile
  fixture-session.mjs 造一条带 usage 事件的测试日志
```

**职责边界**：`*.jsx` 只做视图和一次 fetch；所有派生逻辑进 `statsModel.js` / `usage.js`（纯函数、无 React）。这样窗口化和分桶规则可以脱离渲染器单测。

## 宿主半（lib/index.js）

两个端点，都走 `route()` 辅助（回环闸门 + 仅 GET + JSON 应答）：

| 端点 | 来源 |
|---|---|
| `GET /api/dsh-scope/days` | 折算全部会话日志，增量输出按天/按模型用量 |
| `GET /api/dsh-scope/balance` | 调 `deepseekAccount` 服务的余额 + 赠金明细 |

**增量折算**：每会话 fold 状态缓存在内存并持久化到 `~/.dsh/storages/dsh-scope-cache.json`；每次请求只折上次之后新增的事件。活跃会话折内存尾部；持久会话按后端 revision 跳过未变更的，变更时只读新增后缀。稳态 O(新增事件)。

**折算语义**对齐 `dsh-token-meter` 的 `tokenUsage` 投影：usage 样本挂在 `assistant/chunk`（`data.chunk.type === "usage"`）或 `assistant/message`（`data.usage`）；同一 (turn, step) 重复样本**替换**旧值而非叠加，并重归因到后一事件的日期与模型。

**account 服务是可选的**，按需 `ctx.get('deepseekAccount')`，不写进 `inject`——这样没挂账号平台的 profile 也能加载本插件，余额页报 `unavailable` 而不是整插件挂掉。

### 宿主半的坑

- **attached 但未物化的会话 `events` 是空数组**。这种会话不能标记为已处理，否则持久化通道跳过它 → 整条历史静默归零。已在 `collectUsage` 里 `continue` 跳过并留给持久化通道。
- **赠金过期时间**来自 `getUnnotifiedBonuses`（余额接口本身没有过期字段）。只读，**绝不调用 `ackBonusNotified`**——那会替用户清掉平台上的赠金提示。它只含用户**未确认**的赠金，已确认的会消失，这是平台行为。
- 持久会话按**事件下标**读（`handle.read(offset)`），不是按 seq；日志被截断/重写时靠 seq 连续性判断并全量重折。

## 客户端半（lib/client.js）

Slot 挂载点：

| Slot | 组件 | 说明 |
|---|---|---|
| `sidebar.footer.action` | `UsageStats` | 触发器 + 面板外壳 |
| `conversation.session.header.actions` (order 30) | `ContextLens` | 透镜触发器 |

**数据流**：页面组件一次 fetch，之后所有视图由该 payload 派生（派生在 `statsModel.js`）。加载走 `useRemote`——最短忙碌 450ms（防止 spinner 闪一帧像没反应）+ 模块级缓存（面板卸载后再开不重放 loading）+ 陈旧响应守卫。

**面板高度锁**：`UsageStats` 用 ResizeObserver 量当前页面的自然高度，把 min-height 钉在包装层上，锚点是**应用用量页**（模块级记忆）。锚定它而不是"当前页"，是因为如果停在矮的余额页，下次打开会被钉矮、切回主页面就跳变。代价是余额页下方留白。

**刷新按钮是 icon-only**：标题栏已有标题和页签，第三个带文字的控件是竞争。加载进度由 `aria-busy` 驱动旋转，label 永不变（否则标题栏会抖）。

### 客户端半的坑

- **locales.js 两个字典必须同步**。改完跑一遍对比（键数应一致）。
- **CSS 是 JS 模板字符串**，注释里**不能出现反引号**——会终结字符串，报 PARSE_ERROR 且报错位置指向注释行，很误导。
- 骨架屏复用真实布局 class（`.dcl-hm` 真实 52×7 空网格、`.dcl-chart` 同容器），高度才对得上；别用固定像素估。

## 构建 / 安装 / 验证

```sh
npm install
npm run build                       # 产出 lib/index.js（宿主）+ lib/client.js（浏览器）
node scripts/install.mjs desktop    # 装进 profile，幂等
# 客户端：刷新页面即可；宿主：重启 dsh
```

验证端点（无需认证）：

```sh
curl http://127.0.0.1:19387/api/dsh-scope/days | jq '.summary'
curl http://127.0.0.1:19387/api/dsh-scope/balance
```

`401 unauthorized` = 路由没注册（宿主没重启）；`200` = 正常。

## 发布

```sh
npm version patch|minor && npm publish
```

- 需要 **bypass-2FA** 的 granular token（包策略是「2FA 或 bypass token」）。在 npm 的 tokens 页建，**只勾选本包** + 勾 Bypass 2FA，发布后立即删除。普通 token 会报 `EOTP`，且账号只有 security key、没有 TOTP 码可输。
- `files` 字段**明确列出** `lib/index.js`、`lib/client.js`——不要整个 `lib` 目录，否则 3.6MB 的 source map 会进包。
- 宿主半有改动时，README 要提醒用户**重启才生效**。
- 发版后检查 `npm view dsh-scope description` 是否为最新（npm 页面的描述来自 package.json）。

## 兼容性

验证过 `dsh` 0.1.0-rc.6 和 0.2.0-rc.2。**peerDependencies 里 `@deepseek-ai/*` 的范围要放宽**（当前 `>=0.1.0-rc.6 <0.3.0`）——太严会被 preflight 静默禁用（见上级 AGENTS.md 排查记录第 1 条）。

持久化接口两代都支持：0.2.x 用 `open(id,'read')` + `handle.read(offset)`，旧版用 `readFrom(id, fromSeq)`；`list()` 归一化为 `{header, revision}`。
