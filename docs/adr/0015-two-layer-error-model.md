# 错误响应采用 HTTP 状态码与 ErrorCode 双层模型，契约只锁定枚举名

2xx 成功响应直接返回业务 DTO 或 `204` 空体，不外包 `{ code, message, data }` 包装壳；只有出错时才返回统一的 `ErrorResponse(code, message, data)`（对应 `api/openapi.yaml` 的 `Error` schema）。

错误表达有意分成两层，缺一不可：

1. **HTTP 状态码**：绑定在每个 `ErrorCode` 枚举值上（`400` / `401` / `403` / `404` / `409` / `410` / `429` / `500`），供网关、监控与 Axios 响应拦截器按类别处置（如识别 `401`、`429`、`5xx`）。
2. **语义 `ErrorCode` 字符串**：表达具体业务或系统原因，供前端精确分流。例如 `409` 下区分 `ALREADY_PURCHASED`、`PURCHASE_COOLDOWN`、`CAMPAIGN_NOT_STARTED` 与 `CAMPAIGN_ENDED`；`500` 下区分 `UNIT_POOL_INCONSISTENT` 与 `INTERNAL_ERROR`。前端分支一律判断 `ApiError.code`，禁止解析服务端 `message` 文本。

**服务端文案与堆栈脱敏边界**：`Error.message` 定义为可直接展示给访问者的中文文案。后端 `GlobalExceptionHandler` 在出口统一捕获未预料异常（`Exception`），仅在服务端日志记录堆栈，对外固定返回 `500` `INTERNAL_ERROR`（`"服务出了点问题"`），不把堆栈或内部异常信息泄露给调用方。前端请求层（`web/src/api/client.ts`）对 `429` 与 `5xx` 保留服务端响应体中的 `message` 原文，仅在缺失 `message` 时回落前端兜底文案；抢购失败处置表（`claimFailure.ts`）对 `UNIT_POOL_INCONSISTENT`、`INTERNAL_ERROR`、`RATE_LIMITED` 透传该服务端文案，对其他领域错误码则映射为对齐 `GLOSSARY.md` 的处置提示。

**契约同步边界**：`ErrorCodeContractTest` 在 `./mvnw verify` 阶段比对 Java `ErrorCode` 枚举与 `api/openapi.yaml` 的 `ErrorCode` 枚举双向差集，仅锁定枚举常量名一致，**不把中文文案与 HTTP 状态码写进 OpenAPI 枚举或契约比对测试**。文案微调不会引起 OpenAPI 漂移与前端类型重新生成。

## 与既有 ADR 的关系

- **[ADR-0001](0001-claim-binds-collectible-number.md)**：要求收藏编号池与配额不同步时「整个操作失败并抛出可识别的业务异常」。双层模型通过 `UNIT_POOL_INCONSISTENT`（HTTP `500`）落实该要求——网关与监控把它归入 5xx 异常告警，前端则通过 `code` 与通用 `INTERNAL_ERROR` 区分并透传服务端脱敏提示。
- **[ADR-0013](0013-two-tier-cooldown.md)**：要求购买冷却与已达本场额度在 `409` 下明确区分（`PURCHASE_COOLDOWN` 与 `ALREADY_PURCHASED`），依赖语义 `ErrorCode` 才能在不新增 HTTP 状态码的前提下精确分流。
- **[ADR-0014](0014-category-as-resource.md)**：与本 ADR 同理区分「跨端分支必需的契约闭集」与「允许各自演进的可变内容」——`ErrorCode` 枚举常量名是契约闭集，文案与状态细粒度演化不绑进枚举契约。

## Considered Options

- **所有接口（含 2xx）统一包装 `{ code, message, data }`**：每个成功接口都要多解一层包装，生成类型与 API 封装增加样板，且把业务失败塞进 HTTP `200` 会让网关、浏览器缓存与拦截器失去状态码语义。
- **只用 HTTP 状态码分流，不设语义 `ErrorCode`**：同一状态码下（如 `409` 的多种售卖拦截、`500` 的收藏编号池异常与未知异常）无法区分具体成因，前端无法给出准确处置。
- **把文案与 HTTP 状态码也耦合进 OpenAPI 枚举或契约校验**：每次调整错误提示文案都要同步改 `api/openapi.yaml` 并重跑 `gen:types` 触发前端构建，把展示文案耦合进跨端接口契约。
- **前端拦截器一律覆盖 `5xx` 的服务端 `message`**：早期版本曾这样做，但会抹掉 `UNIT_POOL_INCONSISTENT` 等已脱敏的服务端可辨识信息。既然服务端已由 `GlobalExceptionHandler` 兜住未捕获异常堆栈，前端只需在缺 `message` 时兜底，不应主动丢弃服务端提示。

## Consequences

- 新增或删除错误码必须同时修改 `src/main/java/com/sunshinefps/shared/ErrorCode.java` 与 `api/openapi.yaml` 的 `components.schemas.ErrorCode`，否则 `ErrorCodeContractTest` 直接阻断 CI；同时仍需核对具体接口的 `responses` 声明是否列出对应状态码与错误码，枚举对齐不自动保证单接口出口可达（参见 [contract-gaps](../wiki/contract-gaps.md)）。
- 后端禁止绕过 `GlobalExceptionHandler` 向外暴露原始异常堆栈；前端任何分支禁止匹配 `message` 字符串，也不得覆盖服务端已下发的 `5xx` / `429` 文案（原 `contract-gaps.md` 中关于 `client.ts` 覆盖 5xx 文案的旧描述已按此更正）。
- **可逆性**：属于跨端错误封套约定。若后续需要随错误返回结构化上下文（如冷却到期时刻），可直接启用预留字段 `ErrorResponse.data`（`[object, 'null']`），不破坏既有调用方；若要把 2xx 改为统一包装体，则属于牵动全量契约与前端 API 层的破坏性变更。
