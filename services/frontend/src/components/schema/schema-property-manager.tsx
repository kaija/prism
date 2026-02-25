"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SchemaProperty, SchemaPropertyCreate, SchemaPropertyUpdate, SchemaType } from "@/types/api";
import { useSchemaStore } from "@/stores/schema-store";
import { PropertyTable } from "./property-table";
import { PropertyFormModal } from "./property-form-modal";

export interface SchemaPropertyManagerProps {
  projectId: string;
  schemaType: SchemaType;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

export function SchemaPropertyManager({ projectId, schemaType }: SchemaPropertyManagerProps) {
  const { properties, loading, fetchProperties, addProperty, updateProperty, removeProperty } =
    useSchemaStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProperty, setEditingProperty] = useState<SchemaProperty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchemaProperty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    fetchProperties(projectId, schemaType);
  }, [projectId, schemaType, fetchProperties]);

  const handleAdd = () => {
    setEditingProperty(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = (property: SchemaProperty) => {
    setEditingProperty(property);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProperty(null);
  };

  const handleSubmit = async (data: SchemaPropertyCreate | SchemaPropertyUpdate) => {
    if (modalMode === "create") {
      await addProperty(projectId, schemaType, data as SchemaPropertyCreate);
      showToast("屬性已成功建立", "success");
    } else if (editingProperty) {
      await updateProperty(projectId, schemaType, editingProperty.id, data as SchemaPropertyUpdate);
      showToast("屬性已成功更新", "success");
    }
    setModalOpen(false);
    setEditingProperty(null);
  };

  const handleDeleteClick = (property: SchemaProperty) => setDeleteTarget(property);
  const handleDeleteCancel = () => setDeleteTarget(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeProperty(projectId, schemaType, deleteTarget.id);
      showToast("屬性已成功刪除", "success");
    } catch {
      showToast("刪除失敗，請稍後再試", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Portaled overlays (modals + toasts) render at document.body
  const overlays = mounted ? createPortal(
    <>
      <PropertyFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        initialData={editingProperty}
        mode={modalMode}
      />

      {deleteTarget && (
        <div className="ds-modal" data-testid="delete-confirm-dialog">
          <div className="ds-modal-backdrop" onClick={handleDeleteCancel} />
          <div className="ds-modal-content" role="dialog" aria-label="確認刪除" style={{ maxWidth: 420 }}>
            <div className="ds-modal-header">
              <h3 className="ds-modal-title">確認刪除</h3>
            </div>
            <div className="ds-modal-body">
              <p style={{ color: "var(--text-default)", lineHeight: 1.6 }}>
                確定要刪除屬性「<strong>{deleteTarget.name}</strong>」嗎？此操作無法復原。
              </p>
            </div>
            <div className="ds-modal-footer">
              <button type="button" className="ds-btn ds-btn-secondary" onClick={handleDeleteCancel} disabled={deleting}>
                取消
              </button>
              <button type="button" className="ds-btn ds-btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? "刪除中…" : "刪除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="ds-toast-container" data-testid="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`ds-toast ${toast.type === "success" ? "ds-toast-success" : "ds-toast-error"}`}
              role="status"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </>,
    document.body,
  ) : null;

  return (
    <div className="ds-card" data-testid="schema-property-manager">
      <div className="ds-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>屬性列表</span>
        <button type="button" className="ds-btn ds-btn-primary ds-btn-sm" onClick={handleAdd}>
          + 新增屬性
        </button>
      </div>
      <div className="ds-card-body" style={{ padding: 0 }}>
        <PropertyTable
          properties={properties}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>
      {overlays}
    </div>
  );
}
