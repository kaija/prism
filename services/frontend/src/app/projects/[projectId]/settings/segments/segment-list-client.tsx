"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSegmentStore } from "@/stores/segment-store";
import type { SegmentResponse } from "@/types/api";

export interface SegmentListClientProps {
  projectId: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

export function SegmentListClient({ projectId }: SegmentListClientProps) {
  const router = useRouter();
  const { segments, listLoading, listError, fetchSegments, removeSegment } =
    useSegmentStore();

  const [deleteTarget, setDeleteTarget] = useState<SegmentResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    fetchSegments(projectId, 1, 100);
  }, [projectId, fetchSegments]);

  const handleNew = () => {
    router.push(`/projects/${projectId}/settings/segments/new`);
  };

  const handleEdit = (segment: SegmentResponse) => {
    router.push(`/projects/${projectId}/settings/segments/${segment.segment_id}/edit`);
  };

  const handleDeleteClick = (segment: SegmentResponse) => {
    setDeleteTarget(segment);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeSegment(projectId, deleteTarget.segment_id);
      showToast("Segment 已成功刪除", "success");
    } catch {
      showToast("刪除失敗，請稍後再試", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  const overlays = mounted
    ? createPortal(
        <>
          {deleteTarget && (
            <div className="ds-modal" data-testid="delete-confirm-dialog">
              <div className="ds-modal-backdrop" onClick={handleDeleteCancel} />
              <div
                className="ds-modal-content"
                role="dialog"
                aria-label="確認刪除"
                style={{ maxWidth: 420 }}
              >
                <div className="ds-modal-header">
                  <h3 className="ds-modal-title">確認刪除</h3>
                </div>
                <div className="ds-modal-body">
                  <p style={{ color: "var(--text-default)", lineHeight: 1.6 }}>
                    確定要刪除 Segment「<strong>{deleteTarget.name}</strong>
                    」嗎？此操作無法復原。
                  </p>
                </div>
                <div className="ds-modal-footer">
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary"
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn-danger"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                  >
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
      )
    : null;

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="page-subtitle">管理 Profile 分群規則</p>
        </div>
        <button
          type="button"
          className="ds-btn ds-btn-primary"
          onClick={handleNew}
          data-testid="new-segment-btn"
        >
          + New
        </button>
      </div>

      <div className="ds-card" data-testid="segment-list">
        <div className="ds-card-body" style={{ padding: 0 }}>
          {listLoading ? (
            <div style={{ padding: 48, textAlign: "center" }} data-testid="loading-state">
              <div className="ds-spinner" />
            </div>
          ) : listError ? (
            <div className="ds-empty-state" data-testid="error-state">
              <p style={{ color: "var(--danger)" }}>{listError}</p>
            </div>
          ) : segments.length === 0 ? (
            <div className="ds-empty-state" data-testid="empty-state">
              <p>尚無任何 Segment。</p>
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                onClick={handleNew}
                style={{ marginTop: 12 }}
              >
                建立第一個 Segment
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ds-table" data-testid="segment-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((segment) => (
                    <tr key={segment.segment_id} data-testid={`segment-row-${segment.segment_id}`}>
                      <td style={{ fontWeight: 500 }}>{segment.name}</td>
                      <td style={{ color: segment.description ? undefined : "var(--text-muted)" }}>
                        {segment.description || "—"}
                      </td>
                      <td>{formatDate(segment.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="ds-btn ds-btn-outline ds-btn-sm"
                            onClick={() => handleEdit(segment)}
                            aria-label={`編輯 ${segment.name}`}
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            className="ds-btn ds-btn-sm"
                            onClick={() => handleDeleteClick(segment)}
                            aria-label={`刪除 ${segment.name}`}
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
          )}
        </div>
      </div>
      {overlays}
    </>
  );
}
