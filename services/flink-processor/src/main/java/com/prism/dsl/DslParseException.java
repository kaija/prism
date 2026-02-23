package com.prism.dsl;

/**
 * Exception thrown when a DSL expression cannot be parsed.
 */
public class DslParseException extends RuntimeException {

    public DslParseException(String message) {
        super(message);
    }

    public DslParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
