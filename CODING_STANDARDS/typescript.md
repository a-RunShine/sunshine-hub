# CODING_STANDARDS.md（TypeScript）

> **给谁看**：code review 阶段的 reviewer，不给 implementer 加载。
> **怎么来的**：每条对应一类已知的失败模式；能自动查的写成检查，只留判断题在这里。
> **怎么用**：review 时逐条对照 diff；已在工具里强制的规则，不在这里重复。
> **事故记录是示例**：本项目尚未有真实事故，括号内的场景来自同类项目的常见失败，不是本仓库历史。

---

## 数据与类型

### 接口类型只在一处定义，不手抄后端字段

后端返回什么，`src/types` 里就该有对应的那份定义，`src/api` 引用它，组件再引用 `src/api`。任何地方出现第二个手写的 `{ orderNo: string; status: string }` 都是隐患。

手抄的代价是漂移。后端把 `closeReason` 改名，前端不会报错，上线后用户点开订单看到一片 undefined。

字段对不上时改定义，不要在组件里做二次映射兜住。兜住的那次映射会成为下一个人的困惑。

*Enforced by*: ESLint 的 `no-restricted-imports` 禁止 `src/api` 与 `src/mocks` 之外直接导入 `@/types/api`；但是否在组件里手抄后端内联字段或做多余二次映射，仍靠 review 判断。

---

### 金额一律用整数分传输和计算

后端接口返回的 `amount`、`freight`、`unitPrice` 都是分。前端只在展示时除以 100，中间不做浮点运算。

`0.1 + 0.2 !== 0.3` 这件事，在优惠计算里会变成一分钱对不上，然后运营来找你。

*Enforced by*: 无。review 看金额相关的变量有没有 `parseFloat` 或直接参与乘法。

---

## 状态

### 服务端状态和客户端状态分开管

商品列表、订单详情、库存数字，这些是服务端状态，不要塞进 Zustand 当全局变量。

Zustand 只放真正的客户端状态：登录态、从哪来的跳转参数、弹窗开关。

混在一起的后果是缓存失效逻辑失控。用户在详情页看到的库存，是十分钟前某个页面存进去的那份。

*Enforced by*: 无。review 看 store 里有没有 `products`、`orders`、`stock` 这类字段。

---

### 跨页面共享的状态必须在 store，页面内的状态用 useState

判断标准：换一个页面还需要的，进 store；刷新页面就该丢的，留在组件里。

把页面内状态塞进 store，下次进来会带着上次的残留；把跨页面状态塞进组件，就得靠 props 一层层传。

*Enforced by*: 无。这是 review 时的判断题。

---

## 组件

### 组件的 props 表达意图，不是内部状态的切片

一个组件如果需要八个 props 才能渲染，说明它把「怎么组合」的责任推给了调用方。

传整个 `order` 对象，让组件自己决定取哪些字段。要区分形态就加 `variant="compact"`，不要加 `showFreight`、`hideStatus`、`isPaid` 这类开关。开关一多，组件内部就是一堆 if，调用方还得逐个理解开关的含义。

信号：props 里有三个以上以 `show`、`hide`、`is`、`without` 开头的布尔值。

这和接口深度是一回事。窄接口的组件，调用方看名字就会用；宽接口的组件，调用方得先读一遍源码。

*Enforced by*: 无。review 时数 props。

---

### 组件不直接发请求，走 api 层

`src/components` 和 `src/views` 里不出现 `fetch` 和 `axios`，只调 `src/api` 导出的函数。

请求散在组件里，改一个接口地址要翻遍所有页面，而且没法统一处理鉴权失败和错误提示。

*Enforced by*: ESLint 的 `no-restricted-imports`，在 `components` 与 `views` 目录下禁止 import axios。已配置。

---

### shadcn 的组件不改源码，要定制就包一层

`src/components/ui/` 下是 shadcn 拷进来的源码。直接用，不修改。

需要改行为时，在同一层新建自己的组件包住它，把定制写在外层。

直接改源码的代价出现在下次加新组件的时候：CLI 会覆盖同名文件，你的改动静默消失。

*Enforced by*: `scripts/check-ui-primitives.mjs`（`pnpm ui:check`，已接入 `pnpm check` 与 CI）校验 `src/components/ui/` 全部 `.ts`/`.tsx` 文件的 SHA-256 校验和；ESLint 同步禁止该目录导入业务模块或引入项目设计类名。需要新增或升级官方原语后通过 `pnpm ui:sync` 更新清单，review 核对变更合理性。

---

### 不在渲染期发请求

组件函数体里直接调接口，每次渲染都会触发一次。要发请求就放进 `useEffect` 并写清依赖，或者用请求库的 hook。

正确的依赖数组同样重要。少写一个依赖，页面不更新；多写一个对象，无限循环。

*Enforced by*: ESLint 的 `react-hooks/exhaustive-deps`，warning 级。渲染期请求本身靠 review 判断。

---

### 纯视觉装饰符号与图标必须加 aria-hidden="true"

箭头（`→`）、斜杠、切角边角线和纯装饰 SVG 图标写进 DOM 时，会混进按钮或链接的可访问名称里，导致读屏朗读乱码，也让测试里的 `getByRole(..., { name })` 与文本查询脆弱耦合到装饰字符。

*Enforced by*: 无。review 看 JSX 里的装饰性箭头、角线、SVG 图标有没有包 `aria-hidden="true"`（承载独立语义的可交互图标应给 `aria-label`）。

---

### 不按可变 categoryId 或样本商品名硬编码展示与规则

遵循 ADR-0014，分类是运营可随时增删的资源而非契约枚举，样式、兜底剪影、图标与快捷词只能跟随 `/categories` 返回值动态生成。一旦按具体 `categoryId` 或样板商品名写死分支，运营新增或重命名分类后前端就会显示错位；确需按系统闭集区分时，只用 `ProductKind`（`VIRTUAL` / `PHYSICAL`）。

*Enforced by*: 无。review 看组件与工具函数里有没有针对数字 `categoryId` 或具体分类/商品名称字面量的 `switch`、映射表与条件分支。

---

## 展示

### 每个数据页面都必须有加载态和空态

抢购页在开售瞬间最常见的就是白屏，因为数据还没回来。空态也是，列表为空时不能只有一片白。

三个状态缺一不可：加载中、有数据、无数据。错误态算第四个，接口挂了不能停在转圈上。

*Enforced by*: 无。review 看页面的渲染分支里有没有这三个。

---

### 分页列表做页内临时筛选时必须明示作用范围

服务端分页接口尚未支持某项搜索或筛选参数之前，若在前端对当前页 `items` 做过渡性过滤，计数区严禁把服务端 `total` 当作筛选命中总数展示，必须在界面上明确标明作用范围（如「当前仅筛本页」）。否则第 2 页有数据却在前台展示误导性总件数，会让购买人误以为全店只剩当前页这些结果。

*Enforced by*: 无。review 看分页接口下游是否对 `items` 做了 `.filter()`，以及计数文案和空态引导是否与服务端 `total` 区分开。

---

## 不写在这里的东西

| 内容 | 该去哪 |
|---|---|
| 缩进、引号、分号 | Prettier |
| 未使用变量、`any`、import 顺序 | ESLint |
| 类型错误 | `tsc --noEmit` |
| 组件命名与文件位置 | ESLint 的 `react/jsx-filename-extension` 与目录约定 |
| 接口地址、环境变量 | `.env` 与 `src/config` |
| 依赖版本 | `package.json` |

---

## 这份文件怎么变长

1. 发现 agent 做了错的事。
2. 判断：能机械判定吗？
   - 能 → 写成 ESLint 规则或类型约束，不写在这里。
   - 不能 → 记一条，格式照上面：一句祈使句 + 为什么 + 谁来强制。
3. 写不出具体后果的规则，多半是通用建议，删掉。

超过 15 条，说明该做成检查的还躺在文档里。
