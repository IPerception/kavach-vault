package com.kavach.exception;

import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.kavach.exception.CredentialNotFoundException;
import com.kavach.exception.DuplicateCredentialException;
import com.kavach.exception.InvalidOtpException;
import com.kavach.exception.OtpRateLimitException;

/**
 * Catch-all exception handler that formats every unhandled exception as RFC 7807 ProblemDetail
 * (Content-Type: application/problem+json).
 *
 * Spring Boot 3's ProblemDetailsExceptionHandler (enabled via spring.mvc.problemdetails.enabled=true)
 * already handles standard Spring MVC exceptions (MethodArgumentNotValidException, etc.).
 * This handler runs last (@Order LOWEST_PRECEDENCE) and catches anything that slips through,
 * ensuring the API never leaks an HTML error page or an unstructured stack trace to the client.
 *
 * Custom domain exceptions (e.g., InvalidOtpException, DuplicateCredentialException) will be
 * added here in their respective phases with specific HTTP status codes.
 */
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ProblemDetail handleInvalidCredentials(InvalidCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Unauthorized");
        return problem;
    }

    @ExceptionHandler(VaultAlreadyInitializedException.class)
    public ProblemDetail handleVaultAlreadyInitialized(VaultAlreadyInitializedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        return problem;
    }

    @ExceptionHandler(CredentialNotFoundException.class)
    public ProblemDetail handleCredentialNotFound(CredentialNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Not Found");
        return problem;
    }

    @ExceptionHandler(DuplicateCredentialException.class)
    public ProblemDetail handleDuplicateCredential(DuplicateCredentialException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        return problem;
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ProblemDetail handleInvalidOtp(InvalidOtpException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Unauthorized");
        return problem;
    }

    @ExceptionHandler(OtpRateLimitException.class)
    public ProblemDetail handleOtpRateLimit(OtpRateLimitException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        problem.setTitle("Too Many Requests");
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Bad Request");
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleAllUnhandledExceptions(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.");
        problem.setTitle("Internal Server Error");
        return problem;
    }
}
