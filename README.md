# TUF 谱面与成绩查询工具

基于 [TUF（The Universal Forums）](https://tuforums.com) 公开 API 的 ADOFAI 谱面检索 / 详情 / 玩家排名工具，附带 X-Accuracy 计算器与分数公式整理资料。

纯静态页面（HTML / CSS / 原生 JavaScript，无依赖、无构建），直接调用 `https://api.tuforums.com`。所有页面顶部均有导航栏（谱面搜索 / 玩家排名）。

## 功能

### 谱面搜索（index.html）

- 按谱面 ID 精确查询，或按谱面名查询
  - 模糊匹配：忽略空格与标点，按词匹配（如 `hello bpm` → `Hello (BPM)`）
  - 精确匹配：保留空格与标点，可只输入一部分
- 筛选条件：歌曲时长（时 / 分 / 秒）、总轨道数范围、初始 BPM 范围（闭区间）、谱面 ID 范围
- 排序：谱面 ID / 时长 / 总轨道数，支持多级优先级
- 特殊难度（Unranked / Impossible / Censored / P0）默认隐藏，勾选后展示
- 结果卡片：常规信息、评级明细（按需加载）、原始响应，并支持从 CDN 下载谱面
- 分页浏览（每页 20 条），点击卡片进入详情页
- 右下角「准度计算」悬浮按钮：输入六项判定数量即可计算 XAcc，结果精确到 0.0001%

### 谱面详情（level.html）

- 通过 URL 参数 `?id=<谱面 ID>` 访问，从搜索页点击卡片自动跳转
- 常规信息：曲师、谱师、VFX、评级、谱面底分、歌曲时长、总轨道数、初始 BPM
- 关键记录：首通（含 World's First）、最高得分、最高准度、最高速度
- 通关记录表：准度、速度、判定明细、通过日期，支持按准度 / 速度 / 时间排序与分页
- 快捷入口：进入 TUF 界面、下载谱面、观看演示视频

### 玩家排名（ranking.html）

- 通过 TUF API 获取玩家排行榜，默认按排位分数降序
- 支持切换排序字段（排位分数 / 综合分数 / PP 分 / ScoreV2 总分 / WF 分 / 12K 分数 / 平均 XAcc / 通过数 / Universal 通过数 / WF 数）与升序、降序
- 分页展示，每页 50 人
- 展示头像、玩家名、国家、排位分数、PP 分、平均 XAcc、通过数、WF 数，点击玩家名进入 TUF 主页

### XAcc 计算器（Accuracy Calculator.py）

输入六项判定（earlyDouble / earlySingle / ePerfect / perfect / lPerfect / lateSingle），自动计算 X-Accuracy 并弹窗显示结果。

```powershell
pip install easygui
python "Accuracy Calculator.py"
```

### 计算资料（TUF计算知识整理.md）

整理 TUF 分数体系的数据来源、判定权重、XAcc 公式、单曲 Score 公式与 B20 算法，是页面之外的计算参考文档。

## 目录结构

```
.
├── index.html               # 谱面搜索页
├── level.html               # 谱面详情页
├── ranking.html             # 玩家排名页
├── functions/
│   ├── _lib/proxy.js        # Cloudflare Pages Functions 代理逻辑（/v2、/v3 共用）
│   ├── v2/[[path]].js       # 转发 /v2/* 到 TUF API
│   └── v3/[[path]].js       # 转发 /v3/* 到 TUF API
├── Accuracy Calculator.py   # XAcc 计算器（Python + easygui）
├── TUF计算知识整理.md        # 分数计算知识整理
├── API doc.json             # TUF OpenAPI 文档（OpenAPI 3.0.3）
└── PP分计算公式.jpg          # Score 公式原图
```

## 使用方法

### 本地运行

页面需通过本地 HTTP 服务器打开（直接双击以 `file://` 打开会被浏览器 CORS 拦截）：

```powershell
python -m http.server 8000
```

然后访问 <http://localhost:8000/index.html>。本地环境会直接请求 `https://api.tuforums.com`（该 API 允许 localhost 跨域）。

### 部署到 Cloudflare Pages

TUF API 的 CORS 仅允许 `https://tuforums.com` 与 localhost，其他域名（如 `*.pages.dev`）会被浏览器拦截。因此仓库内置了 Pages Functions 代理：

- `functions/v2/[[path]].js`、`functions/v3/[[path]].js` 将同源的 `/v2/*`、`/v3/*` 请求转发到 `https://api.tuforums.com`
- 页面在非 localhost 环境自动改用同源地址，并由代理函数返回响应

将仓库连接到 Cloudflare Pages（构建命令留空，输出目录为根目录）即可，Functions 会随站点自动部署。


## 使用的 TUF 接口

| 接口 | 用途 |
| --- | --- |
| `GET /v2/database/levels` | 搜索谱面（query / sort / 分页） |
| `GET /v2/database/levels/byId/{id}` | 按数字 ID 取谱面详情 |
| `GET /v2/database/levels/{id}` | 按 slug 取谱面详情 |
| `GET /v2/database/levels/{id}/ratings` | 谱面难度评分明细 |
| `GET /v2/database/levels/{id}/cdnData` | CDN 文件元数据（下载用） |
| `GET /v2/database/difficulties` | 难度列表与基础分 `baseScore` |
| `GET /v2/database/passes/level/{levelId}` | 某谱面全部通关记录 |
| `GET /v3/players/leaderboard` | 玩家排行榜（sortBy / order / limit / offset） |

更多接口见 `API doc.json`。

## 公式摘要

```
XAcc  = (perfect + (lPerfect + ePerfect)·0.75 + (earlySingle + lateSingle)·0.4 + earlyDouble·0.2) / sum(judgements)

Score = B · XaccMtp(x) · SpeedMtp(s) · ScoreV2Mtp(a_m) · 0.9^f

B20   = Σ(i=1..20) s_i · 0.9^(i-1)
```

其中 `B` 为关卡基础分，`x` 为 XAcc，`s` 为播放倍数，`a_m = max(0, m - floor(t/315))`（`m` 为空敲数，`t` 为方块数），`f` 为是否非长按默认设置。

各分段函数的完整定义见 [TUF计算知识整理.md](TUF计算知识整理.md)。
