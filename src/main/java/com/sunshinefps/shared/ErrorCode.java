package com.sunshinefps.shared;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    UNAUTHORIZED("请先登录", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("没有权限", HttpStatus.FORBIDDEN),
    REAL_NAME_REQUIRED("请先完成实名认证", HttpStatus.FORBIDDEN),
    REAL_NAME_ALREADY_SET("实名信息已提交，不能修改", HttpStatus.CONFLICT),
    USERNAME_TAKEN("这个用户名已经被占用", HttpStatus.CONFLICT),
    BAD_CREDENTIALS("用户名或密码不对", HttpStatus.UNAUTHORIZED),

    PRODUCT_NOT_FOUND("商品不存在", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND("分类不存在", HttpStatus.NOT_FOUND),
    CATEGORY_IN_USE("分类下还有商品，先迁移商品再删除", HttpStatus.CONFLICT),
    CAMPAIGN_NOT_FOUND("场次不存在", HttpStatus.NOT_FOUND),
    CAMPAIGN_NOT_STARTED("还没到开售时间", HttpStatus.CONFLICT),
    CAMPAIGN_ENDED("本场已经结束", HttpStatus.CONFLICT),
    QUOTA_EXCEEDED("配额超过商品限量", HttpStatus.BAD_REQUEST),

    ALREADY_PURCHASED("这件商品你已经买过了", HttpStatus.CONFLICT),
    PURCHASE_COOLDOWN("这件商品处于购买冷却期，到期后自动恢复可购", HttpStatus.CONFLICT),
    SOLD_OUT("已经抢完了", HttpStatus.GONE),
    UNIT_POOL_INCONSISTENT("编号池与配额不同步", HttpStatus.INTERNAL_SERVER_ERROR),
    RATE_LIMITED("操作太快了，歇一下再试", HttpStatus.TOO_MANY_REQUESTS),

    ORDER_NOT_FOUND("订单不存在", HttpStatus.NOT_FOUND),
    ORDER_NOT_PAYABLE("这个订单现在不能支付", HttpStatus.CONFLICT),
    ORDER_NOT_CANCELLABLE("这个订单现在不能取消", HttpStatus.CONFLICT),
    STOCK_INSUFFICIENT("库存不足", HttpStatus.CONFLICT),
    ADDRESS_REQUIRED("包含实体商品时必须选择收货地址", HttpStatus.BAD_REQUEST),
    ADDRESS_NOT_FOUND("地址不存在，或不属于当前账号", HttpStatus.NOT_FOUND),
    ADDRESS_LIMIT_EXCEEDED("最多保存 10 条收货地址", HttpStatus.BAD_REQUEST),
    ADDRESS_IN_USE("这个地址还被未支付订单使用，先取消订单或换地址", HttpStatus.CONFLICT),
    FULFILLMENT_NOT_FOUND("履约单不存在，或不属于当前账号", HttpStatus.NOT_FOUND),
    FULFILLMENT_NOT_SIGNABLE("这个履约单现在不能签收", HttpStatus.CONFLICT),

    REFUND_NOT_FOUND("退款单不存在", HttpStatus.NOT_FOUND),
    REFUND_NOT_ALLOWED("这笔履约单不支持退款", HttpStatus.CONFLICT),
    REFUND_ALREADY_OPEN("已经有一个未结的退款申请", HttpStatus.CONFLICT),

    ANNOUNCEMENT_NOT_FOUND("公告不存在", HttpStatus.NOT_FOUND),
    EVENT_NOT_FOUND("活动不存在", HttpStatus.NOT_FOUND),

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
