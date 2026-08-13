/**
 * Shared Slider primitive — thumb count follows the supplied values.
 *
 * The component previously rendered exactly one thumb, so every two-value
 * consumer (flight Price, flight Duration, and the two orphaned filter panels)
 * could only move its lower bound. These tests pin both the single-value and the
 * range contract behaviourally: thumbs are counted from the DOM and moved with
 * the keyboard, and the reported values come from onValueChange.
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Slider } from "@/components/ui/slider";

/** Radix moves whichever thumb was focused last. */
function press(thumb: HTMLElement, key: string, times = 1) {
  thumb.focus();
  for (let i = 0; i < times; i++) fireEvent.keyDown(thumb, { key });
}

function ControlledRange({ onChange }: { onChange: (v: number[]) => void }) {
  const [value, setValue] = useState<number[]>([100, 300]);
  return (
    <Slider
      value={value}
      min={100}
      max={300}
      step={10}
      onValueChange={next => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("Slider — thumb count", () => {
  it("renders one thumb for a single controlled value", () => {
    render(<Slider value={[50]} min={0} max={100} />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("renders one thumb for a single uncontrolled defaultValue", () => {
    render(<Slider defaultValue={[50]} min={0} max={100} />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("renders one thumb when no value is supplied at all", () => {
    render(<Slider min={0} max={100} />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("renders two thumbs for a controlled range", () => {
    render(<Slider value={[20, 80]} min={0} max={100} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("renders two thumbs for an uncontrolled range", () => {
    render(<Slider defaultValue={[20, 80]} min={0} max={100} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("gives each thumb its own value", () => {
    render(<Slider value={[20, 80]} min={0} max={100} />);
    const [low, high] = screen.getAllByRole("slider");
    expect(low.getAttribute("aria-valuenow")).toBe("20");
    expect(high.getAttribute("aria-valuenow")).toBe("80");
  });
});

describe("Slider — endpoints move independently", () => {
  it("moves the lower endpoint without disturbing the upper one", () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    const [low] = screen.getAllByRole("slider");

    press(low, "ArrowRight", 5); // 100 → 150
    expect(onChange).toHaveBeenLastCalledWith([150, 300]);
  });

  it("moves the upper endpoint without disturbing the lower one", () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    const [, high] = screen.getAllByRole("slider");

    press(high, "ArrowLeft", 5); // 300 → 250
    expect(onChange).toHaveBeenLastCalledWith([100, 250]);
  });

  it("narrows from both ends", () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    const [low, high] = screen.getAllByRole("slider");

    press(low, "ArrowRight", 3); // 130
    press(high, "ArrowLeft", 3); // 270
    expect(onChange).toHaveBeenLastCalledWith([130, 270]);
  });

  it("still moves a single-value slider", () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={[50]} min={0} max={100} step={5} onValueChange={onChange} />);

    press(screen.getByRole("slider"), "ArrowRight");
    expect(onChange).toHaveBeenLastCalledWith([55]);
  });

  it("respects disabled", () => {
    const onChange = vi.fn();
    render(<Slider value={[20, 80]} min={0} max={100} disabled onValueChange={onChange} />);

    press(screen.getAllByRole("slider")[1], "ArrowLeft");
    expect(onChange).not.toHaveBeenCalled();
  });
});
