import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  // Reset CSS vars on documentElement
  const root = document.documentElement;
  root.style.cssText = "";
});

describe("ThemeProvider", () => {
  it("defaults to light theme when localStorage is empty", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads dark theme from localStorage on mount", () => {
    localStorage.setItem("prism-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("toggles from light to dark and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.getItem("prism-theme")).toBe("dark");
  });

  it("toggles from dark back to light", () => {
    localStorage.setItem("prism-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.getItem("prism-theme")).toBe("light");
  });

  it("sets CSS variables on document.documentElement for light mode", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--body-bg")).toBe("#f3f7fa");
    expect(root.style.getPropertyValue("--card-bg")).toBe("#ffffff");
    expect(root.style.getPropertyValue("--text-color")).toBe("#3c4858");
    expect(root.style.getPropertyValue("--border-color")).toBe("#eff0f6");
    expect(root.style.getPropertyValue("--sidebar-bg")).toBe("#1b2430");
    expect(root.style.getPropertyValue("--primary")).toBe("#4a77f0");
  });

  it("sets CSS variables on document.documentElement for dark mode", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle"));

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--body-bg")).toBe("#242f3d");
    expect(root.style.getPropertyValue("--card-bg")).toBe("#1c2531");
    expect(root.style.getPropertyValue("--text-color")).toBe("#dde5ed");
    expect(root.style.getPropertyValue("--border-color")).toBe("#2a3a4a");
    expect(root.style.getPropertyValue("--sidebar-bg")).toBe("#1b2430");
    expect(root.style.getPropertyValue("--primary")).toBe("#4a77f0");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
  });
});
