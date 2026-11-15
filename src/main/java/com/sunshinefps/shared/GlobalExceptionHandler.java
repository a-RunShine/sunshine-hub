package com.sunshinefps.shared;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理。把异常翻译成契约里定义的错误响应体与 HTTP 状态码。
 *
 * <p>两件事在这个类里定死：业务异常走 {@link ErrorCode} 自带的文案与状态码，未预料的异常一律 500 且不把堆栈泄露给调用方。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ErrorResponse> handleBiz(BizException ex) {
        var code = ex.errorCode();
        log.warn("业务异常 {}: {}", code.name(), ex.getMessage());
        return ResponseEntity.status(code.status()).body(ErrorResponse.of(code, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        var first = ex.getBindingResult().getFieldErrors().stream().findFirst();
        var detail = first.map(e -> e.getField() + " " + e.getDefaultMessage()).orElse("参数不合法");
        return badRequest(detail);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex) {
        return badRequest(ex.getMessage());
    }

    private static ResponseEntity<ErrorResponse> badRequest(String detail) {
        return ResponseEntity.status(ErrorCode.BAD_REQUEST.status())
                .body(ErrorResponse.of(ErrorCode.BAD_REQUEST, detail));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        // 只记日志，不把堆栈和内部消息返给调用方
        log.error("未预料的异常", ex);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.status())
                .body(ErrorResponse.of(ErrorCode.INTERNAL_ERROR));
    }
}
