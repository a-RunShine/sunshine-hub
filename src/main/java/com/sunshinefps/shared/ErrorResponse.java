package com.sunshinefps.shared;

/**
 * 错误响应体，对应契约里的 Error schema。
 *
 * <p>成功响应不走这个包装，直接返回 DTO。只有出错时才套这一层。
 */
public record ErrorResponse(String code, String message, Object data) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.name(), errorCode.message(), null);
    }

    public static ErrorResponse of(ErrorCode errorCode, String message) {
        return new ErrorResponse(errorCode.name(), message, null);
    }
}
