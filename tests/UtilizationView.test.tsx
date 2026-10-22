import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UtilizationView, {
  CPU_UTILIZATION_QUERY_NAME,
  GPU_UTILIZATION_QUERY_NAME,
} from "../src/components/QueryView/UtilizationView";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../src/components/ui/theme";

// two cards in the current hour: one online a quarter of the time, one all of it
// and two nodes, half busy and fully online
const { period, rows, cpuRows, requests } = vi.hoisted(() => {
  const period = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
  const card = { manufacturer: "NVIDIA", model: "A100", period_start: period, gpus_reporting: 1 };
  const node = {
    model: "AMD EPYC 7302P",
    period_start: period,
    nodes_reporting: 1,
    logical_cpus: 32,
    percent_time_online: 100,
    avg_utilization_percent_while_online: 50,
    memory_percent_used: 20,
  };
  return {
    period,
    rows: [
      { ...card, gpu_group: "uuid-a", gpu_label: "GPU 0", percent_time_online: 25, avg_utilization_percent_while_online: 80 },
      { ...card, gpu_group: "uuid-b", gpu_label: "GPU 1", percent_time_online: 100, avg_utilization_percent_while_online: 10 },
    ],
    cpuRows: [
      { ...node, cpu_group: "n001" },
      { ...node, cpu_group: "n002" },
    ],
    // the parameters of each query made
    requests: [] as Record<string, string>[],
  };
});

vi.mock("../src/hooks/useDataFrameQuery", () => ({
  default: (queryName: string, params: Record<string, string>) => {
    requests.push(params);
    return { data: queryName === "cpu-utilization" ? cpuRows : rows, isLoading: false, error: null };
  },
}));

class NoopObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", NoopObserver);
vi.stubGlobal("IntersectionObserver", NoopObserver);
// jsdom has no canvas, so text widths are estimated
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  requests.length = 0;
});

const renderView = (queryName = GPU_UTILIZATION_QUERY_NAME) =>
  render(
    <ChakraProvider value={system}>
      <UtilizationView queryName={queryName} querySelect={null} />
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

describe("CPU utilization view", () => {
  it("lists nodes by CPU model, with busy CPUs in the tooltip", () => {
    const { container } = renderView(CPU_UTILIZATION_QUERY_NAME);
    expect(screen.getByText("AMD EPYC 7302P (2 nodes)")).toBeInTheDocument();
    expect(screen.getByText("n002")).toBeInTheDocument();

    fireEvent.mouseMove(cellOf(container, "n001"));
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/16\.0 of 32 CPUs/)).toBeInTheDocument();
  });

  it("explains the numbers behind the info button", async () => {
    renderView(CPU_UTILIZATION_QUERY_NAME);
    fireEvent.click(screen.getByRole("button", { name: "About these numbers" }));
    expect(await screen.findByText(/share of the node's logical CPUs/)).toBeInTheDocument();
  });
});

describe("settings in the URL", () => {
  const lastRequest = () => requests[requests.length - 1];

  it("starts from the URL's settings", () => {
    window.history.replaceState(null, "", "/?level=model&bucket=1+day&range=custom&dates=2026-10-01..2026-10-07&metric=memory");
    renderView(CPU_UTILIZATION_QUERY_NAME);
    expect(lastRequest()).toEqual({
      level: "model",
      bucket_length: "1 day",
      start: "2026-10-01T00:00:00.000Z",
      end: "2026-10-08T00:00:00.000Z",
    });
    expect(screen.getByText(/^Memory used while online: 0%/)).toBeInTheDocument();
  });

  it("falls back to defaults for values the view doesn't allow", () => {
    // card is a GPU level; 15 minute buckets are too fine for a year
    window.history.replaceState(null, "", "/?level=card&range=1+year&bucket=15+minutes&dates=2026-10-07..2026-10-01");
    renderView(CPU_UTILIZATION_QUERY_NAME);
    expect(lastRequest()).toEqual({ level: "node", bucket_length: "1 day", length: "1 year" });
  });

  it("writes changed settings to the URL, leaving defaults out", async () => {
    window.history.replaceState(null, "", "/?view=query&query=gpu-utilization");
    renderView();
    // the switch toggles a tick after the click
    fireEvent.click(screen.getByLabelText("Axis on top"));
    await waitFor(() => expect(window.location.search).toBe("?view=query&query=gpu-utilization&axis=bottom"));
    fireEvent.click(screen.getByLabelText("Axis on top"));
    await waitFor(() => expect(window.location.search).toBe("?view=query&query=gpu-utilization"));
  });
});
