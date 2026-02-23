"use client";

import { useActionState } from "react";
import { createProjectAction } from "./actions";

export function CreateProjectForm() {
  const [state, formAction, isPending] = useActionState(createProjectAction, {
    error: null,
  });

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1 }}>
        <input
          name="name"
          type="text"
          placeholder="New project name"
          required
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid #eff0f6",
            borderRadius: "4px",
            fontSize: "0.9rem",
          }}
        />
        {state.error && (
          <p style={{ color: "red", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.5rem 1rem",
          background: "#4a77f0",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          fontSize: "0.9rem",
        }}
      >
        {isPending ? "Creating…" : "Create Project"}
      </button>
    </form>
  );
}
