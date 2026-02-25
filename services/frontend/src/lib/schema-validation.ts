/**
 * Schema property form validation logic.
 *
 * Validates user input before submitting to the Schema API,
 * returning field-level error messages for any invalid fields.
 */

export interface SchemaFormData {
  name: string;
  data_type: string;
  description?: string | null;
  property_type: "static" | "dynamic";
  formula?: string | null;
}

export interface SchemaFormErrors {
  name?: string;
  data_type?: string;
  formula?: string;
}

/**
 * Validates schema property form data.
 *
 * Rules:
 * - name: must not be empty or whitespace-only (Req 7.1)
 * - data_type: must be selected / non-empty (Req 7.2)
 * - formula: required when property_type is "dynamic" (Req 7.3)
 *
 * @returns An object mapping field names to error messages.
 *          An empty object means the form data is valid.
 */
export function validateSchemaPropertyForm(
  data: SchemaFormData,
): SchemaFormErrors {
  const errors: SchemaFormErrors = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = "名稱為必填欄位";
  }

  if (!data.data_type) {
    errors.data_type = "資料型別為必填欄位";
  }

  if (
    data.property_type === "dynamic" &&
    (!data.formula || data.formula.trim().length === 0)
  ) {
    errors.formula = "動態屬性必須提供 Formula";
  }

  return errors;
}
