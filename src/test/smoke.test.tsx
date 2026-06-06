import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePage } from "../features/home/HomePage.tsx";

describe("HomePage", () => {
  it("renders heading", () => {
    render(<HomePage />);
    expect(screen.getByText("Finance Assistant")).toBeInTheDocument();
  });
});
