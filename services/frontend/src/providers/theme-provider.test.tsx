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
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.cssText = "";
});

describe("ThemeProvider", () => {
  it("defaults to dark theme when localStorage is empty", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("reads light theme from localStorage on mount", () => {
    localStorage.setItem("prism-theme", "light");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggles from dark to light and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.getItem("prism-theme")).toBe("light");
  });

  it("toggles from light back to dark", () => {
    localStorage.setItem("prism-theme", "light");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.getItem("prism-theme")).toBe("dark");
  });

  it("sets data-theme attribute on document.documentElement for dark mode", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("sets data-theme attribute on document.documentElement for light mode", () => {
    localStorage.setItem("prism-theme", "light");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
  });
});
