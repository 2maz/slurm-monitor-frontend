import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GpuUtilizationView from "../src/components/QueryView/UtilizationView";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../src/components/ui/theme";

// two cards in the current hour: one online a quarter of the time, one all of it
const { period, rows } = vi.hoisted(() => {
  const period = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
  const card = { manufacturer: "NVIDIA", model: "A100", period_start: period, gpus_reporting: 1 };
  return {
    period,
    rows: [
      { ...card, gpu_group: "uuid-a", gpu_label: "GPU 0", percent_time_online: 25, avg_utilization_percent_while_online: 80 },
      { ...card, gpu_group: "uuid-b", gpu_label: "GPU 1", percent_time_online: 100, avg_utilization_percent_while_online: 10 },
    ],
  };
});

vi.mock("../src/hooks/useDataFrameQuery", () => ({
  default: () => ({ data: rows, isLoading: false, error: null }),
}));

class NoopObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", NoopObserver);
vi.stubGlobal("IntersectionObserver", NoopObserver);
// jsdom has no canvas, so text widths are estimated
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

const renderView = () =>
  render(
    <ChakraProvider value={system}>
      <GpuUtilizationView querySelect={null} />
    </ChakraProvider>,
  );

const cellOf = (root: ParentNode, group: string) => root.querySelector(`[data-group="${group}"][data-period="${period}"]`)!;

describe("GpuUtilizationView heatmap", () => {
  it("renders one SVG cell per card and period, with labels and section headers", () => {
    const { container } = renderView();
    const cells = (group: string) => container.querySelectorAll(`svg [data-group="${group}"]`).length;
    expect(cells("uuid-a")).toBeGreaterThanOrEqual(24);
    expect(cells("uuid-b")).toBe(cells("uuid-a"));
    expect(screen.getByText("GPU 0")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA · A100 (2 cards)")).toBeInTheDocument();
  });

  it("sizes the box of a cell by time online", () => {
    const { container } = renderView();
    // full-size cells are 20px wide; a quarter of the area has half the side
    const [background, box] = cellOf(container, "uuid-a").querySelectorAll("rect");
    expect(background).toHaveAttribute("width", "20");
    expect(box).toHaveAttribute("width", "10");
    // fully online: the box covers the cell
    expect(cellOf(container, "uuid-b").querySelectorAll("rect")).toHaveLength(1);
  });

  it("shows the values of a hovered cell", () => {
    const { container } = renderView();
    fireEvent.mouseMove(cellOf(container, "uuid-a"));
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("downloads the legend, grid and axis as a standalone SVG", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:chart");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderView();

    fireEvent.click(screen.getByText("Download SVG"));
    await waitFor(() => expect(click).toHaveBeenCalled());

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("image/svg+xml");
    const svg = new DOMParser().parseFromString(await blob.text(), "image/svg+xml").documentElement;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.textContent).toContain("Utilization while online: 0%");
    expect(svg.textContent).toContain("GPU 1");
    expect(svg.querySelectorAll(`[data-period="${period}"]`)).toHaveLength(2);
    // sticky labels fall back to their place when scrolled to the start
    expect(svg.innerHTML).toContain("var(--scroll, 0px)");
  });
});
