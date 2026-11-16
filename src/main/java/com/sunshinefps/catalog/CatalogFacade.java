package com.sunshinefps.catalog;

/**
 * 商品模块的对外入口。Product、Sku、Campaign、Allocation 都在这个接口后面。
 *
 * <p>抢购的原子扣减也由这里提供，因为配额与编号都是它的。它不认识 Order，只接收一个 orderNo 字符串。
 */
public interface CatalogFacade {}
