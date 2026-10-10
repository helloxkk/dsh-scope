# dsh-scope

[![npm version](https://img.shields.io/npm/v/dsh-scope.svg)](https://www.npmjs.com/package/dsh-scope)
[![npm downloads](https://img.shields.io/npm/dm/dsh-scope.svg)](https://www.npmjs.com/package/dsh-scope)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![dsh.so security](https://www.dsh.so/badges/dsh-scope.svg)](https://www.dsh.so/artifact/dsh-scope/)

[English](README.md) · **简体中文**

**[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）的使用统计插件** —— 跨全部会话的 Token 用量总览面板，外加当前会话的上下文透镜。

DeepSeek Harness 算了大量 token 账，却一点都不给你看。`dsh-scope` 把它呈现在两处。

![使用统计面板](docs/panel-zh.png)

## 功能

### 使用统计（侧边栏底部）

从侧栏底部打开 —— 展开时显示文字，收起时显示图标。

- **累计摘要** —— 累计与峰值日 Token、最长聊天时长、当前与最长连续天数。
- **Token 活动** —— 52 周热力图，三种模式：**每日**（按当天用量着色）、**每周**（每列求和）、**累计**（跨列累加）。同一张网格，既可以一眼看全年，也可以看增长趋势。
- **时间范围** —— 近 7 日 / 近 30 日，驱动下方两张图。
- **每日 Token 趋势** —— 每个模型一条折线，带可换行图例与逐日 tooltip；只有窗口期内用过的模型才会成为序列。
- **模型用量** —— 环形图，中心显示窗口内总量，右侧为百分比列表。

整个面板只向插件自己的回环端点发一次请求。

### Context Lens（会话头部）

针对当前会话的窗口占用读数：头部的实时占用率圆环，展开后显示 system / tools / messages 分段构成条、四桶会话累计与 KV 缓存命中率。数据来自官方 `token-meter` 会话投影（`useProjection`）—— 无 RPC、无自定义协议。

## 环境要求

- `dsh` ≥ `0.1.0-rc.6` 在 `PATH` 上（已在 `0.1.0-rc.6` 与 `0.2.0-rc.2` 验证）
- Node.js 22.18+ 或 24.11+（仅从源码构建时需要）

## 安装

```sh
dsh plugin --profile <profile> add dsh-scope
dsh web                             # 重启 dsh 加载插件
```

`<profile>` 是你实际使用的 `~/.dsh/profiles/` 下的目录名 —— 桌面端为 `desktop`。

<details>
<summary>从源码安装</summary>

```sh
git clone https://github.com/helloxkk/dsh-scope.git
cd dsh-scope
npm install && npm run build
node scripts/install.mjs <profile>   # 例如 desktop / headless / rescue
dsh web                              # 重启 dsh 加载插件
```

脚本遇到不存在的 profile 会直接报错而不是猜。

</details>

安装脚本把 `lib/`、`cordis.patch.yml`、`package.json` 复制进 profile 的 `node_modules`，并向 profile 的 `cordis.patch.yml` 追加 bundle insert。**幂等**，每次 rebuild 后可重复执行。

## 卸载

```sh
rm -rf ~/.dsh/profiles/<profile>/node_modules/dsh-scope
# 再从 ~/.dsh/profiles/<profile>/cordis.patch.yml 删掉 "# dsh-scope" 块
rm -f ~/.dsh/storages/dsh-scope-cache.json   # 可选：清掉 fold 缓存
```

## 工作原理

**宿主半**（`lib/index.js`）—— 一个只读、仅回环的端点 `GET /api/dsh-scope/days`。

聚合是增量的。每会话 fold 状态缓存在内存并持久化到 `~/.dsh/storages/dsh-scope-cache.json`；每次请求只 fold 上次之后新增的事件。活跃会话 fold 内存尾部；持久会话在存储后端的不透明 revision 未变时直接跳过，变化时只读新增后缀，带连续性检查，日志被截断或重写则全量重 fold。稳态成本 O(新增事件)，日志再大也不变慢。

Fold 语义对齐 `dsh-token-meter` 的 `tokenUsage` 投影。usage 样本挂在 `assistant/chunk`（`data.chunk.type === "usage"`）或 `assistant/message`（`data.usage`）上；同一 (turn, step) 的重复样本**替换**旧值而非重复计数，并重新归因到后一事件所在的日期与模型。模型归因跟随 `assistant/message` 的 `data.message.source`，回退到最近的 `request/header` 配置。

除 token 桶外，fold 还会按天统计 `turn/start` 与 `tool/call` 事件（供热力图每周/累计模式的 tooltip 使用），并记录每个会话首末事件时间戳，用于摘要的最长聊天时长。传输的 payload 携带每天的全部模型而非截断的 top-N，因此趋势图与环形图能覆盖所有模型。

**浏览器半**（`lib/client.js`，通过 package.json 的 `dsh.client` 声明被发现）：

- `sidebar.footer.action` 渲染使用统计触发器。面板同源 fetch `/api/dsh-scope/days`，所有视图都由这一份数据推导。
- `conversation.session.header.actions`（order 30，排在任务列表之后）渲染透镜触发器。弹出面板读取三个官方投影 —— `tokenUsage`（整个持久日志累计的四桶）、`contextPressure`（输入侧窗口压力 + 路由的 context window）、`contextBreakdown`（下一次请求的 system/tools/message 启发式构成）。

**不外发任何数据。** 端点在任何处理前拒绝非回环调用者和非 GET 方法，不读取任何 provider 凭据。

## 开发

```sh
npm install
npm run build                          # tsdown: 宿主 ESM + 浏览器 ModuleLoader bundle
node scripts/fixture-session.mjs       # 可选: 写一条带 usage 事件的演示会话日志
node scripts/install.mjs <profile>     # 然后重启 dsh
```

`npm run build` 产出两个文件：

- `lib/index.js` —— Node 宿主半。`@deepseek-ai/*` 保持 external，运行时对 profile 自身的安装解析。
- `lib/client.js` —— 浏览器半，包装成 harness ModuleLoader 工厂格式。平台模块（`react`、`@deepseek-ai/dsh-client-*`）保持 external，通过 loader 注入的 `require` 解析；其余全部内联，包括 Recharts。

由于 harness 在启动时缓存插件模块，**只有客户端半会热重载**。改过 `src/index.js` 或 `src/usage.js` 后必须重启 dsh。

## 兼容性

基于 `dsh` `0.1.0-rc.6` 与 `0.2.0-rc.2`（`@deepseek-ai/dsh-base` / `dsh-web-app` bundle）构建并验证。harness 处于开发者预览阶段迭代很快 —— 预期会有破坏性变更。

宿主半按已安装 `sessionPersistence` 实际提供的接口读取持久化日志：`0.2.x` 用 `open(id, 'read')` + `handle.read(offset)`，旧版本用 `readFrom(id, fromSeq)`；`list()` 统一归一化为 `{ header, revision }` 快照，两种形态折叠结果一致。

dsh 只在启动时 import 一次插件模块，**profile 配置热重载无法替换宿主半代码 —— 重新构建后需要重启 dsh**。

## 致谢

图表使用 [Recharts](https://github.com/recharts/recharts)（MIT）。

本项目包含派生自某 Apache-2.0 第三方项目的代码。许可证要求的归属声明与
派生文件清单见 [NOTICE.md](NOTICE.md)。

## 许可

[MIT](LICENSE)
