# CODING_STANDARDS.md（Java）

> **给谁看**：code review 阶段的 reviewer，不给 implementer 加载。
> **怎么来的**：每条对应一类已知的失败模式；能自动查的写成检查，只留判断题在这里。
> **怎么用**：review 时逐条对照 diff；已在工具里强制的规则，不在这里重复。
> **事故记录是示例**：本项目尚未有真实事故，括号内的场景来自同类项目的常见失败，不是本仓库历史。

---

## 库存与并发

### 库存的每一次变更只能经过既有的两条路径

限时抢购走 Lua 脚本扣配额，常规与折扣走 `t_sku` 的乐观锁。这两条路径之外，任何地方都不该出现"读库存、算新值、写回去"。

第三处出现的时候，多半是有人图省事在某个补偿逻辑里直接改了数字。那时候前两条路径的校验全部绕过，超卖就是从这里开始的。

新增需求要改库存时，先问：能不能加在现有路径的一个分支里？不能，再谈第三条路径，并且它必须有自己的并发测试。

*Enforced by*: 无。review 时搜 `setStock`、`stock -`、`setAvailable`，看命中点是不是只有那两个地方。

---

### 乐观锁的 update 之后必须检查影响行数

`UPDATE t_order SET status = ? WHERE id = ? AND status = 'PENDING_PAYMENT' AND version = ?` 返回 0，意思是这次更新没生效，有人先动手了。

不检查就等于没加锁。代码照常往下走，订单被覆盖，钱和货对不上。

影响行数为 0 时不要重试，按当前状态重新读一次再决定。支付回调和关单的竞争里，输的一方要做的动作和赢的一方完全不同。

*Enforced by*: 无。review 看每条带 `version` 条件的 update，后面有没有 `if (rows == 0)`。

---

### 事务方法内不发消息、不调外部 HTTP

消息发出去之后事务回滚，消费方会拿到一条不存在的订单。外部 HTTP 调用失败，事务还卡在那里占着连接。

正确顺序是先提交，再发消息。用 `TransactionSynchronization` 的 afterCommit，或者把发消息挪到事务外层。

*Enforced by*: ArchUnit 部分覆盖（`@Transactional` 方法不得依赖 MQ 模版与 HTTP 客户端）；是否真的需要在这个位置发，由 review 判断。

---

## 测试

### 测试断言必须独立于实现

`assertEquals(mock.getStatus(), service.call(...))` 只证明 mock 在工作。

判断方法一句话：改掉实现、测试不动，它还绿吗？绿就是同义反复，删掉重写。

要断言的是调用方真正依赖的东西：返回值、落库后的状态、后续接口能观察到的事实。

*Enforced by*: 无。这是 review 时的判断题。

---

### 并发测试必须断言最终态的三个数

抢购的并发测试只断言"没抛异常"等于没测。必须同时断言：可用配额归零、占用的 Unit 数恰好等于成功数、编号无重复。

三条少一条就证明不了没超卖。只断言归零，可能卖了 101 份；只断言成功数，可能配额没扣干净。

*Enforced by*: 无。这个测试写在 `FlashSaleConcurrencyTest`，review 时读它的断言部分。

---

### 外部依赖走注入的 port，不在实现里 new

支付网关、短信、对象存储这类三方服务，在模块内部通过构造器注入接口，不要在 service 里 `new XxxClient(...)`。

理由不是好看，是测试要能离线跑完整个逻辑。`new` 在里面的那天，这个类就再也没法在没有网络的 CI 里测了。

只有一个 adapter 的 seam 是假 seam，别提前抽。等第二个 adapter 出现（production + test）再抽也不迟。

*Enforced by*: ArchUnit 部分覆盖；"该不该抽"由 review 判断。

---

## 结构

### 新增的类要经得起删除测试

想象把这个类删掉。如果它的逻辑只是搬回调用方、调用方各加两行就完事，那它是个转发器，不是模块。

转发器增加阅读成本却不减少任何东西。读一个功能要跳三层，每层都只有一行。

四个信号：

- Controller 直接注入 Repository
- Service 的每个方法都只有一行，只是转调另一个 Service 或 Repository
- 一个类有十个以上 public 方法，彼此还不相干
- 包外的类 import 了 `internal` 包

反过来，DTO、Request、Response、枚举天生是浅的，不用管。

深度看的是**调用方需要学多少东西**，不是代码行数。一个方法背后有三百行逻辑、调用方只需要知道它叫什么，这是深的；十个方法各三行、调用方得读十遍，这是浅的。

*Enforced by*: 包边界由 ArchUnit 查（`internal` 包禁止外部访问，error 级）；深度本身是 review 时的判断题。

---

### 字符串状态改成枚举

`"PENDING_PAYMENT"` 散落在 service、mapper、判断里，拼错一个字符是运行时错误，不是编译错误。

改成 `enum` 之后，`switch` 因为缺分支而编译失败，这才是能红的信号。

数据库里存的仍然是字符串，转换在 mapper 层做一次。

*Enforced by*: SpotBugs 的 `ES_COMPARING_STRINGS_WITH_EQ` 查 `==` 比较；枚举化本身靠 review 发现散落常量。

---

### 一个能力只有一个入口

运费计算、编号分配、限购判定、配额守恒校验，各自只该有一处实现。

第二处出现时，bug 一定落在没被测的那套里。新增入口之前，先确认现有入口真的扩展不了。

*Enforced by*: 无。review 时看到新文件在做旧文件已经做过的事，就该问为什么。

---

### 新的领域概念必须继承它所挂靠对象的全部守卫

Unit 挂在 Product 下，那么 Product 的限购校验、发布状态校验，Unit 的写入路径必须自动带上，不能靠人记得。

判断方法：问一句"这个新东西挂在哪？它上面那层现在有哪些检查？"漏掉一条就是数据损坏。

*Enforced by*: 无。挂靠关系只能靠 review 读出来。

---

## 不写在这里的东西

| 内容 | 该去哪 |
|---|---|
| 缩进、import 顺序、花括号 | Spotless |
| 命名规范、类放哪个包 | Checkstyle |
| `domain` 包不得依赖 Spring、MyBatis、Redis | ArchUnit，error 级 |
| 模块外部只能访问 Facade 与 `api` 包 | ArchUnit，error 级 |
| 模块之间不得有循环依赖 | ArchUnit，error 级 |
| Controller 不得依赖 Repository | ArchUnit，error 级 |
| 环境怎么跑起来 | `README.md`、`docker-compose.yml` |
| 依赖版本 | `pom.xml` |

---

## 这份文件怎么变长

1. 发现 agent 做了错的事。
2. 判断：能机械判定吗？
   - 能 → 写成检查（Checkstyle、SpotBugs、ArchUnit、一个测试，挑最便宜的），不写在这里。
   - 不能 → 记一条，格式照上面：一句祈使句 + 为什么 + 谁来强制。
3. 写不出具体后果的规则，多半是通用建议，删掉。

超过 15 条，说明该做成检查的还躺在文档里。
