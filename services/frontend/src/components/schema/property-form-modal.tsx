"use client";

import React, { useState, useEffect } from "react";
import type {
  SchemaProperty,
  SchemaPropertyCreate,
  SchemaPropertyUpdate,
} from "@/types/api";
import { APIError } from "@/lib/api-client";
import {
  validateSchemaPropertyForm,
  type SchemaFormErrors,
} from "@/lib/schema-validation";

const DATA_TYPE_OPTIONS = ["string", "integer", "boolean", "float", "date"];

export interface PropertyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SchemaPropertyCreate | SchemaPropertyUpdate) => Promise<void>;
  initialData?: SchemaProperty | null;
  mode: "create" | "edit";
}

export function PropertyFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  mode,
}: PropertyFormModalProps) {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<"static" | "dynamic">("static");
  const [formula, setFormula] = useState("");
  const [errors, setErrors] = useState<SchemaFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setName(initialData.name);
      setDataType(initialData.data_type);
      setDescription(initialData.description ?? "");
      setPropertyType(initialData.property_type);
      setFormula(initialData.formula ?? "");
    } else {
      setName("");
      setDataType("");
      setDescription("");
      setPropertyType("static");
      setFormula("");
    }
    setErrors({});
    setApiError(null);
  }, [open, mode, initialData]);

  const clearFieldError = (field: keyof SchemaFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      name,
      data_type: dataType,
      description: description || null,
      property_type: propertyType,
      formula: propertyType === "dynamic" ? formula : null,
    };

    const validationErrors = validateSchemaPropertyForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.statusCode === 409) {
          setErrors((prev) => ({ ...prev, name: "屬性名稱已存在" }));
        } else if (err.statusCode === 422) {
          try {
            const body = JSON.parse(err.message);
            const fieldErrors: SchemaFormErrors = {};
            if (body.detail && Array.isArray(body.detail)) {
              for (const item of body.detail) {
                const field = item.loc?.[item.loc.length - 1];
                if (field && field in fieldErrors === false) {
                  (fieldErrors as Record<string, string>)[field] = item.msg;
                }
              }
            } else if (body.field_errors) {
              Object.assign(fieldErrors, body.field_errors);
            }
            if (Object.keys(fieldErrors).length > 0) {
              setErrors((prev) => ({ ...prev, ...fieldErrors }));
            } else {
              setApiError("驗證錯誤，請檢查輸入資料");
            }
          } catch {
            setApiError("驗證錯誤，請檢查輸入資料");
          }
        } else {
          setApiError("發生錯誤，請稍後再試");
        }
      } else {
        setApiError("發生錯誤，請稍後再試");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "create" ? "新增屬性" : "編輯屬性";

  return (
    <div className="ds-modal" data-testid="property-form-modal">
      <div className="ds-modal-backdrop" onClick={onClose} />
      <div className="ds-modal-content" role="dialog" aria-label={title}>
        <div className="ds-modal-header">
          <h3 className="ds-modal-title">{title}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ds-modal-body">
            {apiError && (
              <div className="ds-alert ds-alert-danger" role="alert">
                {apiError}
              </div>
            )}

            {/* Name */}
            <div className="ds-form-group">
              <label htmlFor="prop-name" className="ds-label ds-label-required">名稱</label>
              <input
                id="prop-name"
                type="text"
                className={`ds-input${errors.name ? " is-invalid" : ""}`}
                value={name}
                maxLength={128}
                required
                placeholder="屬性名稱"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "prop-name-error" : undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
              />
              {errors.name && <div id="prop-name-error" className="ds-field-error">{errors.name}</div>}
            </div>

            {/* Data type */}
            <div className="ds-form-group">
              <label htmlFor="prop-data-type" className="ds-label ds-label-required">資料型別</label>
              <select
                id="prop-data-type"
                className={`ds-select${errors.data_type ? " is-invalid" : ""}`}
                value={dataType}
                required
                aria-invalid={!!errors.data_type}
                aria-describedby={errors.data_type ? "prop-data-type-error" : undefined}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setDataType(e.target.value);
                  clearFieldError("data_type");
                }}
              >
                <option value="">請選擇資料型別</option>
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.data_type && <div id="prop-data-type-error" className="ds-field-error">{errors.data_type}</div>}
            </div>

            {/* Description */}
            <div className="ds-form-group">
              <label htmlFor="prop-description" className="ds-label">描述</label>
              <textarea
                id="prop-description"
                className="ds-textarea"
                value={description}
                placeholder="選填描述"
                rows={3}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              />
            </div>

            {/* Property type */}
            <div className="ds-form-group">
              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <legend className="ds-label ds-label-required">屬性類型</legend>
                <div className="ds-radio-group">
                  <label className="ds-radio-label">
                    <input
                      type="radio"
                      name="property_type"
                      value="static"
                      checked={propertyType === "static"}
                      onChange={() => {
                        setPropertyType("static");
                        clearFieldError("formula");
                      }}
                    />
                    Static
                  </label>
                  <label className="ds-radio-label">
                    <input
                      type="radio"
                      name="property_type"
                      value="dynamic"
                      checked={propertyType === "dynamic"}
                      onChange={() => setPropertyType("dynamic")}
                    />
                    Dynamic
                  </label>
                </div>
              </fieldset>
            </div>

            {/* Formula (dynamic only) */}
            {propertyType === "dynamic" && (
              <div className="ds-form-group" data-testid="formula-field">
                <label htmlFor="prop-formula" className="ds-label ds-label-required">Formula</label>
                <textarea
                  id="prop-formula"
                  className={`ds-textarea${errors.formula ? " is-invalid" : ""}`}
                  value={formula}
                  required
                  placeholder="DSL 公式"
                  rows={3}
                  aria-invalid={!!errors.formula}
                  aria-describedby={errors.formula ? "prop-formula-error" : undefined}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setFormula(e.target.value);
                    clearFieldError("formula");
                  }}
                />
                {errors.formula && <div id="prop-formula-error" className="ds-field-error">{errors.formula}</div>}
              </div>
            )}
          </div>

          <div className="ds-modal-footer">
            <button type="button" className="ds-btn ds-btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="ds-btn ds-btn-primary" disabled={submitting}>
              {submitting ? "提交中…" : mode === "create" ? "新增" : "儲存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
