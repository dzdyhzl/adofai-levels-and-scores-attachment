# TUF 分数计算 已知信息整理

> 本文档由三份材料整理：`API doc.json`、`Accuracy Calculator.py`（XAcc 计算器，现已由 index.html 内置计算器取代并从仓库移除）、`PP分计算公式.jpg`（后两者曾位于仓库根目录，现与本文件同在知识库目录）。
> 有疑问的条目已标【待确认】，请直接在此文件上修改。
> 变量名统一使用 TUF 字段名。

## 1. 数据来源（API doc.json）

### 谱面信息

| 接口 | 用途 |
| --- | --- |
| `GET /v2/database/levels` | 搜索谱面（query / pguRange / sort / tags / 分页） |
| `GET /v2/database/levels/{id}` | 按 slug 取谱面详情 |
| `GET /v2/database/levels/byId/{id}` | 按数字 ID 取谱面详情 |
| `GET /v2/database/levels/{id}/ratings` | 谱面难度评分 |
| `GET /v2/database/levels/{id}/community-tags` | 社区标签 |
| `GET /v2/database/levels/{id}/level.adofai` | 谱面文件（可用于解析方块数 t） |
| `GET /v2/media/thumbnail/level/{levelId}` | 谱面缩略图 |

### 难度与基础分 B

| 接口 | 用途 |
| --- | --- |
| `GET /v2/database/difficulties` | 难度列表，含 `baseScore`（即公式里的 B） |
| `GET /v2/database/difficulties/hash` | 难度数据 hash |

### 成绩（Pass）

| 接口 | 用途 |
| --- | --- |
| `GET /v2/database/passes/level/{levelId}` | 某谱面全部 pass（含 players、judgements、accuracy、scoreV2、speed） |
| `GET /v2/database/passes/{id}` | 单个 pass 详情 |
| `GET /v2/database/passes/level/{levelId}/placement?score=` | 用模拟 scoreV2 查该谱排名，返回 `{ rank, total, tied }` |
| `GET /v2/database/passes/level/{levelId}/calculator-player?playerId=` | 返回 `{ bestOnLevel, top20 }`，用于 B20/上分影响预览 |

### 排行榜 / 玩家

| 接口 | 用途 |
| --- | --- |
| `GET /v2/database/leaderboard` | 排行榜（v2） |
| `GET /v3/players/leaderboard` | 玩家排行榜（v3） |
| `GET /v3/players/{id}` / `/{id}/profile` | 玩家资料 |
| `GET /v3/players/{id}/passes` | 玩家成绩列表 |

### 接口注意事项

- 文档无 `servers`（base URL 需自行确定）。
- `components.schemas` 为空，绝大多数 200 响应只有文字描述，实际字段需用真实响应验证。
- 认证实际是 Cookie 会话：`POST /v2/auth/login` 返回 cookies + sessionId；`POST /v2/auth/refresh` 用 refresh cookie；`GET /v2/auth/csrf` 给跨域 SPA 用 CSRF token。跨域请求需 `credentials: include` + CSRF。
- 文档给各接口标了 `bearerAuth`，匿名是否可用读接口需实测。
- 实现方案：直接调用 TUF API 取数（base URL 需从站点确认）。

## 2. 判定字段与权重

| TUF 字段 | 用途 |
| --- | --- |
| earlyDouble | XAcc 权重 0.2；同时是空敲数 `m` |
| earlySingle | XAcc 权重 0.4 |
| ePerfect | XAcc 权重 0.75 |
| perfect | XAcc 权重 1.0 |
| lPerfect | XAcc 权重 0.75 |
| lateSingle | XAcc 权重 0.4 |

不参与计算的输入（一律按 0，已从脚本移除）：Overload、Miss、Checkpoints、lateDouble。

X-Perfect 模式补充：

- `perfectMinus`、`perfectPlus` 是 `isXPerfectMode = true` 时出现的判定窗口，计算时合并进 `perfect`：
  `perfect_calc = perfect + perfectMinus + perfectPlus`
- 合并后的 `perfect_calc` 整体计入分母 `judgements`。
- 非 X-Perfect 模式下不存在这些窗口。

## 3. X-Accuracy 公式（Accuracy Calculator.py）

```
XAcc = ( perfect
       + (lPerfect + ePerfect) * 0.75
       + (earlySingle + lateSingle) * 0.4
       + earlyDouble * 0.2 )
       / sum(judgements)
```

- `judgements` 即第 2 节 6 项判定之和。

## 4. 单曲 Score 公式（PP分计算公式.jpg）

```
Score = B · XaccMtp(x) · SpeedMtp(s) · ScoreV2Mtp(a_m) · 0.9^f
```

参数来源：

| 参数 | 含义 | 来源 |
| --- | --- | --- |
| B | 关卡基础分 | `GET /v2/database/difficulties` 的 `baseScore` |
| x | 关卡 X 精准度 | 第 3 节 XAcc |
| s | 播放倍数 | pass 的 `speed` |
| m | 空敲数 | `earlyDouble` |
| t | 关卡方块数量 | chart stats 或解析 `level.adofai` |
| a_m | `max(0, m - floor(t/315))` | 由 m、t 计算 |
| f | 是否"不是长按默认设置" | pass 的 `isNoHoldTap`（默认为 0，玩家确认后为 1） |

### XaccMtp(x)

```
x < 0.95            → 1
0.95 ≤ x < 1        → -0.027/(x - 1.0054) + 0.513
x = 1               → -2100/(B + 262.5) + 14
```

- `x = 1` 的高值与不连续是刻意设计，属正常现象。
- 原 `x > 1` 分支已删去；若因计算精度出现 `x > 1`，直接将 `x` 赋值为 1 再代入。
- 该曲线为站点默认曲线；少数关卡有专属 xacc 曲线（`PATCH /v2/database/levels/{id}/xacc-curve`，含 pin 位置），与默认曲线不同，暂按默认曲线计算。

`adofaiVersion` 不影响公式；`isXPerfectMode` 只影响判定窗口合并（见第 2 节）。

### SpeedMtp(s)

输入校验：`s < 1` 时提示"通关速率必须≥1"，不参与计算。

```
s = 1            → 1
1 ≤ s < 1.1      → -3.5s + 4.5
1.1 ≤ s < 1.5    → 0.65
1.5 ≤ s < 2      → 0.7s - 0.4
s ≥ 2            → 1
```

### ScoreV2Mtp(a_m)

`a_m = max(0, m - floor(t/315))`，其中 `m` 为空敲数（`earlyDouble`），`t` 为方块数量；`a_m` 为非负整数。

按顺序判定，先命中先返回：

```
1. m = 0              → 1.1
2. a_m = 0            → 1
3. a_m = 1            → 0.9
4. 1 < a_m ≤ 25.5     → 0.9 - 0.2 · ((a_m - 1)/24.5)^0.7
5. 25.5 < a_m ≤ 50    → 0.5 + 0.2 · ((50 - a_m)/24.5)^0.7
6. a_m > 50           → 0.5
```

- 原图第三行写作 `1 ≤ a_m ≤ 1`；因 `a_m` 为整数，等价于 `a_m = 1`，且与第 4 档在 `a_m = 1` 处连续（都是 0.9）。
- `m = 0` 时 `a_m` 也为 0，按顺序先判 `m = 0` → 1.1。

## 5. B20 算法

```
B20 = Σ(i = 1..20) s_i · 0.9^(i-1)
```

- `s_i`：该玩家每谱击破得分最高的一次，分数由第 4 节公式算出（Score），降序排列后的第 i 名。
- 第 1 名权重 1，第 20 名权重 `0.9^19 ≈ 0.135`。
- top20 数据可来自 `calculator-player` 的 `top20`；新成绩影响 = 合并重排后重算 B20 的差值。

## 6. 计算链路

```
TUF judgements
  → XAcc（第 3 节）
  → 单曲 Score：B · XaccMtp(x) · SpeedMtp(s) · ScoreV2Mtp(a_m) · 0.9^f（第 4 节）
  → 每谱最佳降序取前 20 → B20 = Σ s_i · 0.9^(i-1)（第 5 节）
```

- 输出格式：XAcc 为 `**.****%`（保留 4 位小数），Score 为 `*****.**`（保留 2 位小数）。

校验方式：用 TUF pass 记录自带的 `scoreV2` 反推验证公式实现。

## 7. 待确认清单（汇总）

（暂无）
