import { describe, it, expect } from "vitest";
import {
  validateSchemaPropertyForm,
  type SchemaFormData,
} from "./schema-validation";

const validStatic: SchemaFormData = {
  name: "age",
  data_type: "integer",
  property_type: "static",
};

const validDynamic: SchemaFormData = {
  name: "score",
  data_type: "float",
  property_type: "dynamic",
  formula: "sum(events.value)",
};

describe("validateSchemaPropertyForm", () => {
  it("returns empty errors for valid static data", () => {
    expect(validateSchemaPropertyForm(validStatic)).toEqual({});
  });

  it("returns empty errors for valid dynamic data", () => {
    expect(validateSchemaPropertyForm(validDynamic)).toEqual({});
  });

  // Req 7.1 — name must not be empty
  it("returns name error when name is empty string", () => {
    const errors = validateSchemaPropertyForm({ ...validStatic, name: "" });
    expect(errors.name).toBeDefined();
  });

  it("returns name error when name is whitespace only", () => {
    const errors = validateSchemaPropertyForm({ ...validStatic, name: "   " });
    expect(errors.name).toBeDefined();
  });

  // Req 7.2 — data_type must be selected
  it("returns data_type error when data_type is empty", () => {
    const errors = validateSchemaPropertyForm({
      ...validStatic,
      data_type: "",
    });
    expect(errors.data_type).toBeDefined();
  });

  // Req 7.3 — formula required for dynamic
  it("returns formula error when dynamic and formula is missing", () => {
    const errors = validateSchemaPropertyForm({
      ...validDynamic,
      formula: null,
    });
    expect(errors.formula).toBeDefined();
  });

  it("returns formula error when dynamic and formula is empty string", () => {
    const errors = validateSchemaPropertyForm({
      ...validDynamic,
      formula: "",
    });
    expect(errors.formula).toBeDefined();
  });

  it("returns formula error when dynamic and formula is whitespace only", () => {
    const errors = validateSchemaPropertyForm({
      ...validDynamic,
      formula: "   ",
    });
    expect(errors.formula).toBeDefined();
  });

  it("does not return formula error for static even if formula is empty", () => {
    const errors = validateSchemaPropertyForm({
      ...validStatic,
      formula: null,
    });
    expect(errors.formula).toBeUndefined();
  });

  it("can return multiple errors at once", () => {
    const errors = validateSchemaPropertyForm({
      name: "",
      data_type: "",
      property_type: "dynamic",
      formula: "",
    });
    expect(errors.name).toBeDefined();
    expect(errors.data_type).toBeDefined();
    expect(errors.formula).toBeDefined();
  });
});
