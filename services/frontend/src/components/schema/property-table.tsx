"use client";

import type { SchemaProperty } from "@/types/api";

export interface PropertyTableProps {
  properties: SchemaProperty[];
  loading: boolean;
  onEdit: (property: SchemaProperty) => void;
  onDelete: (property: SchemaProperty) => void;
}

export function PropertyTable({ properties, loading, onEdit, onDelete }: PropertyTableProps) {
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <div className="ds-spinner" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="ds-empty-state">
        尚無屬性定義。
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="ds-table">
        <thead>
          <tr>
            <th>名稱</th>
            <th>資料型別</th>
            <th>類型</th>
            <th>描述</th>
            <th style={{ width: 140 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td style={{ fontWeight: 500 }}>{property.name}</td>
              <td>{property.data_type}</td>
              <td>
                <span
                  className={`ds-badge ${property.property_type === "dynamic" ? "ds-badge-primary" : "ds-badge-success"}`}
                >
                  {property.property_type}
                </span>
              </td>
              <td style={{ color: property.description ? undefined : "var(--text-muted)" }}>
                {property.description ?? "—"}
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="ds-btn ds-btn-outline ds-btn-sm"
                    onClick={() => onEdit(property)}
                    aria-label={`編輯 ${property.name}`}
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn-sm"
                    onClick={() => onDelete(property)}
                    aria-label={`刪除 ${property.name}`}
                    style={{ color: "var(--danger)", borderColor: "var(--danger)", background: "transparent" }}
                  >
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
