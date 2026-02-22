package com.prism.dsl;

import java.io.Serializable;

/**
 * Result of a DSL engine evaluation.
 * Indicates success with a value, or failure with an error message.
 *
 * @param success      true if evaluation succeeded
 * @param value        the result value (null on failure)
 * @param errorMessage the error description (null on success)
 */
public record DslResult(boolean success, Object value, String errorMessage) implements Serializable {

    /** Create a successful result with the given value. */
    public static DslResult ok(Object value) {
        return new DslResult(true, value, null);
    }

    /** Create a failed result with the given error message. */
    public static DslResult error(String msg) {
        return new DslResult(false, null, msg);
    }
}
