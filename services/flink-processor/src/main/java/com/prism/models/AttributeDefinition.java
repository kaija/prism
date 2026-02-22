package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Objects;

/**
 * Defines a dynamic attribute for events or profiles, loaded from the Backend API.
 */
public class AttributeDefinition implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private String type;

    @JsonProperty("entity_type")
    private String entityType; // "event" or "profile"

    private boolean indexed;
    private boolean computed;
    private String formula;

    public AttributeDefinition() {}

    public AttributeDefinition(String name, String type, String entityType,
                               boolean indexed, boolean computed, String formula) {
        this.name = name;
        this.type = type;
        this.entityType = entityType;
        this.indexed = indexed;
        this.computed = computed;
        this.formula = formula;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public boolean isIndexed() { return indexed; }
    public void setIndexed(boolean indexed) { this.indexed = indexed; }

    public boolean isComputed() { return computed; }
    public void setComputed(boolean computed) { this.computed = computed; }

    public String getFormula() { return formula; }
    public void setFormula(String formula) { this.formula = formula; }

    /** Returns true if this is a computed attribute on events. */
    public boolean isEventComputed() {
        return "event".equals(entityType) && computed;
    }

    /** Returns true if this is a computed attribute on profiles. */
    public boolean isProfileComputed() {
        return "profile".equals(entityType) && computed;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AttributeDefinition that = (AttributeDefinition) o;
        return indexed == that.indexed
                && computed == that.computed
                && Objects.equals(name, that.name)
                && Objects.equals(type, that.type)
                && Objects.equals(entityType, that.entityType)
                && Objects.equals(formula, that.formula);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, type, entityType, indexed, computed, formula);
    }
}
