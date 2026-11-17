package com.sunshinefps.shared;

import org.springframework.http.HttpStatus;

/**
 * 业务错误码。一个错误同时带三样东西：给前端做分支的字符串、给用户看的文案、对应的 HTTP 状态码。
 *
 * <p>分成两层是有意的。前端根据字符串决定展示什么，网关和监控根据状态码判断错误类别。只靠其中一层都会失效。
 *
 * <p>新增错误码必须同步 api/openapi.yaml 的 ErrorCode 枚举。
 */
public enum ErrorCode {
    // 认证与身份
    UNAUTHORIZED("请先登录", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("没有权限", HttpStatus.FORBIDDEN),
    REAL_NAME_REQUIRED("请先完成实名认证", HttpStatus.FORBIDDEN),
    REAL_NAME_ALREADY_SET("实名信息已提交，不能修改", HttpStatus.CONFLICT),
    USERNAME_TAKEN("这个用户名已经被占用", HttpStatus.CONFLICT),
    BAD_CREDENTIALS("用户名或密码不对", HttpStatus.UNAUTHORIZED),

    // 商品与售卖
    PRODUCT_NOT_FOUND("商品不存在", HttpStatus.NOT_FOUND),
    CAMPAIGN_NOT_FOUND("场次不存在", HttpStatus.NOT_FOUND),
    CAMPAIGN_NOT_STARTED("还没到开售时间", HttpStatus.CONFLICT),
    CAMPAIGN_ENDED("本场已经结束", HttpStatus.CONFLICT),
    QUOTA_EXCEEDED("配额超过商品限量", HttpStatus.BAD_REQUEST),

    // 抢购
    ALREADY_PURCHASED("这件商品你已经买过了", HttpStatus.CONFLICT),
    PURCHASE_COOLDOWN("这件商品处于购买冷却期，到期后自动恢复可购", HttpStatus.CONFLICT),
    SOLD_OUT("已经抢完了", HttpStatus.GONE),
    UNIT_POOL_INCONSISTENT("编号池与配额不同步", HttpStatus.INTERNAL_SERVER_ERROR),
    RATE_LIMITED("操作太快了，歇一下再试", HttpStatus.TOO_MANY_REQUESTS),

    // 交易
    ORDER_NOT_FOUND("订单不存在", HttpStatus.NOT_FOUND),
    ORDER_NOT_PAYABLE("这个订单现在不能支付", HttpStatus.CONFLICT),
    ORDER_NOT_CANCELLABLE("这个订单现在不能取消", HttpStatus.CONFLICT),
    STOCK_INSUFFICIENT("库存不足", HttpStatus.CONFLICT),
    ADDRESS_REQUIRED("包含实体商品时必须选择收货地址", HttpStatus.BAD_REQUEST),

    // 退款
    REFUND_NOT_FOUND("退款单不存在", HttpStatus.NOT_FOUND),
    REFUND_NOT_ALLOWED("这笔履约单不支持退款", HttpStatus.CONFLICT),
    REFUND_ALREADY_OPEN("已经有一个未结的退款申请", HttpStatus.CONFLICT),

    // 内容
    ANNOUNCEMENT_NOT_FOUND("公告不存在", HttpStatus.NOT_FOUND),
    EVENT_NOT_FOUND("活动不存在", HttpStatus.NOT_FOUND),

    // 兜底
    BAD_REQUEST("参数不合法", HttpStatus.BAD_REQUEST),
    INTERNAL_ERROR("服务出了点问题", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String message;
    private final HttpStatus status;

    ErrorCode(String message, HttpStatus status) {
        this.message = message;
        this.status = status;
    }

    public String message() {
        return message;
    }

    public HttpStatus status() {
        return status;
    }
}
