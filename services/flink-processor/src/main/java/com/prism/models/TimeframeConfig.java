package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Objects;

/**
 * Configuration for trigger rule timeframe filtering.
 * Supports both absolute (start/end timestamps) and relative (duration from now) modes.
 */
public class TimeframeConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    private boolean absolute;
    private Long start;
    private Long end;

    @JsonProperty("relative_duration_ms")
    private Long relativeDurationMs;

    public TimeframeConfig() {}

    public TimeframeConfig(boolean absolute, Long start, Long end, Long relativeDurationMs) {
        this.absolute = absolute;
        this.start = start;
        this.end = end;
        this.relativeDurationMs = relativeDurationMs;
    }

    public boolean isAbsolute() { return absolute; }
    public void setAbsolute(boolean absolute) { this.absolute = absolute; }

    public Long getStart() { return start; }
    public void setStart(Long start) { this.start = start; }

    public Long getEnd() { return end; }
    public void setEnd(Long end) { this.end = end; }

    public Long getRelativeDurationMs() { return relativeDurationMs; }
    public void setRelativeDurationMs(Long relativeDurationMs) { this.relativeDurationMs = relativeDurationMs; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeframeConfig that = (TimeframeConfig) o;
        return absolute == that.absolute
                && Objects.equals(start, that.start)
                && Objects.equals(end, that.end)
                && Objects.equals(relativeDurationMs, that.relativeDurationMs);
    }

    @Override
    public int hashCode() {
        return Objects.hash(absolute, start, end, relativeDurationMs);
    }
}
