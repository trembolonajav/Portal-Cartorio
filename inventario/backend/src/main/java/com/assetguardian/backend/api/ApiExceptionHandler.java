package com.assetguardian.backend.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException exception) {
        String message = exception.getReason() == null || exception.getReason().isBlank()
            ? exception.getStatusCode().toString()
            : exception.getReason();
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of(
            "status", exception.getStatusCode().value(),
            "error", message,
            "message", message
        ));
    }
}
