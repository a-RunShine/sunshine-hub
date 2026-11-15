package com.sunshinefps.trade;

/**
 * 交易模块的对外入口。Order、Fulfillment、Payment、Refund 都在这个接口后面。
 *
 * <p>这四样东西装在一起，是因为它们推进同一个订单状态：退款要改订单状态，履约单从订单拆出来。拆成独立模块就是跨模块事务。
 */
public interface TradeFacade {}
