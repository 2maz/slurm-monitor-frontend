import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AllocationView from "../src/components/QueryView/AllocationView";
import {
  CPU_ALLOCATION,
  GPU_ALLOCATION,
  GPU_ALLOCATION_QUERY_NAME,
  groupSeries,
  splitRow,
  total,
} from "../src/components/QueryView/allocation";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../src/components/ui/theme";

// Two hours of a 16 GPU node, half allocated, an unmonitored node with GPU jobs and a drained one.
const { gpuRows, requests } = vi.hoisted(() => {
  const hour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const periods = [hour - 3_600_000, hour].map((t) => new Date(t).toISOString());
  const row = (period: string, node: string, values: Record<string, number | string | null>) => ({
    period_start: period,
    node,
    gpus_installed: 0,
    gpus_online: 0,
    gpus_allocated: 0,
    gpus_occupied: 0,
    gpus_occupied_outside_slurm: 0,
    gpus_busy: 0,
    percent_time_unavailable: 0,
    gpu_jobs: 0,
    not_counted: null,
    ...values,
  });
  return {

    gpuRows: periods.flatMap((period) => [
      row(period, "g001", { model: "A100", manufacturer: "NVIDIA", gpus_installed: 16, gpus_online: 16, gpus_allocated: 8, gpus_occupied: 6, gpus_busy: 4, gpu_jobs: 3 }),
      row(period, "n013", { gpus_allocated: 2, gpu_jobs: 1, not_counted: "not monitored" }),
      row(period, "srl-login1", { gpus_installed: 1, percent_time_unavailable: 100, not_counted: "out of service" }),
    ]),
    requests: [] as { queryName: string; params: Record<string, string> }[],
  };
});

vi.mock("../src/hooks/useDataFrameQuery", () => ({
  default: (queryName: string, params: Record<string, string>) => {
    requests.push({ queryName, params });
    return { data: gpuRows, dataUpdatedAt: Date.now(), isLoading: false, error: null };
  },
}));

class NoopObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", NoopObserver);

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  requests.length = 0;
});

const renderView = (onQueryName = vi.fn()) =>
  render(
    <ChakraProvider value={system}>
      <AllocationView queryName={GPU_ALLOCATION_QUERY_NAME} querySelect={null} onQueryName={onQueryName} />
    </ChakraProvider>,
  );

describe("splitting capacity into bands", () => {
  it("nests a GPU node's layers and adds up to what is installed", () => {
    const split = splitRow(GPU_ALLOCATION, {
      gpus_installed: 16,
      gpus_allocated: 8,
      gpus_occupied: 6,
      gpus_busy: 4,
      gpus_occupied_outside_slurm: 1,
      percent_time_unavailable: 25,
    });
    expect(split).toEqual({
      busy: 4,
      occupiedIdle: 2,
      allocatedIdle: 2,
      outsideSlurm: 1,
      unavailable: 4,
      notAllocated: 3,
    });
    expect(total(split)).toBe(16);
  });

  it("caps layers by the ones around them", () => {
    // more busy than occupied, more allocated than installed, a draining node with its jobs
    const split = splitRow(GPU_ALLOCATION, {
      gpus_installed: 2,
      gpus_allocated: 2.5,
      gpus_occupied: 1,
      gpus_busy: 1.5,
      percent_time_unavailable: 100,
    });
    expect(split).toMatchObject({ busy: 1, occupiedIdle: 0, allocatedIdle: 1, unavailable: 0, notAllocated: 0 });
    expect(total(split)).toBe(2);
  });

  it("counts CPUs busy beyond the allocations as outside them", () => {
    const split = splitRow(CPU_ALLOCATION, { cpus_installed: 96, cpus_allocated: 48, cpus_busy: 60 });
    expect(split).toMatchObject({ busy: 48, allocatedIdle: 0, outsideSlurm: 12, notAllocated: 36 });
    expect(total(split)).toBe(96);
  });

  it("gives nodes without monitored capacity no bands", () => {
    expect(total(splitRow(GPU_ALLOCATION, { gpus_installed: 0, gpus_allocated: 2 }))).toBe(0);
  });
});

describe("grouping nodes", () => {
  const node = (name: string, model: string, capacity: number, busy: number) => ({
    node: name,
    model,
    manufacturer: "NVIDIA",
    capacity,
    splits: [{ ...splitRow(GPU_ALLOCATION, { gpus_installed: capacity, gpus_allocated: busy, gpus_occupied: busy, gpus_busy: busy }) }],
    allocated: [busy],
  });

  it("adds up the nodes of a model, keeping which they are", () => {
    const groups = groupSeries([node("g001", "A100", 16, 4), node("g002", "A100", 8, 2), node("g003", "V100", 2, 1)], "model");
    expect(groups.map(({ node, capacity, members }) => [node, capacity, members])).toEqual([
      ["A100", 24, ["g001", "g002"]],
      ["V100", 2, ["g003"]],
    ]);
    expect(groups[0].splits[0]).toMatchObject({ busy: 6, notAllocated: 18 });
    expect(groups[0].allocated).toEqual([6]);
  });

  it("leaves nodes as they are by node", () => {
    const nodes = [node("g001", "A100", 16, 4)];
    expect(groupSeries(nodes, "node")).toBe(nodes);
  });
});

describe("Allocation view", () => {
  it("draws the counted nodes, then the others under a heading with their reasons", () => {
    const { container } = renderView();
    const texts = [...container.querySelectorAll("svg text")].map((text) => text.textContent);
    const at = (text: string) => texts.findIndex((t) => t?.startsWith(text));
    expect(texts).toContain("g001");
    expect(at("g001")).toBeLessThan(at("Not in the cluster's totals"));
    expect(at("Not in the cluster's totals")).toBeLessThan(at("n013"));
    expect(texts).toContain("Slurm's job records give jobs 2 GPUs here on average, but the node reports no GPUs to the monitor");
    expect(texts).toContain("not monitored");
    expect(texts).toContain("out of service");
    expect(texts).toContain("srl-login1");
  });

  it("shows the shares of capacity in the legend and per node", () => {
    const { container } = renderView();
    const texts = [...container.querySelectorAll("svg text")].map((text) => text.textContent);
    // 4 of 16 busy, 2 more held by a process, 2 allocated without one
    expect(texts).toContain("Busy 25%");
    expect(texts).toContain("Not allocated 50%");
    // the blank above a cell where less was installed, which is no share of the capacity
    expect(texts).toContain("Not installed (yet or any more)");
    // g001's row of the totals: GPU-hours, allocated, busy of allocated
    const g001 = [...container.querySelectorAll("svg g")].find((g) => g.firstElementChild?.textContent === "g001")!;
    expect([...g001.querySelectorAll("text[text-anchor=end]")].slice(2).map((text) => text.textContent)).toEqual([
      expect.stringMatching(/^\d+$/),
      "50%",
      "50%",
    ]);
  });

  it("asks for the time window", () => {
    renderView();
    expect(requests.at(-1)).toEqual({
      queryName: GPU_ALLOCATION_QUERY_NAME,
      params: { bucket_length: "1 hour", length: "1 day" },
    });
  });

  it("shows the table in place of the figure when switched to it", async () => {
    const { container } = renderView();
    expect(container.querySelector("table")).toBeNull();
    await userEvent.setup().click(screen.getByText("Show as table"));
    expect(window.location.search).toBe("?table=1");
    expect(container.querySelector("svg [data-export]")).toBeNull();
    const cluster = screen.getByText("Cluster", { selector: "td" }).closest("tr")!;
    expect([...cluster.querySelectorAll("td")].map((cell) => cell.textContent)).toEqual([
      "Cluster",
      "",
      "50%",
      "0%",
      "0%",
      "13%",
      "13%",
      "25%",
      "50%",
    ]);
  });

  it("downloads the figure as a standalone SVG without the hover layers", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:chart");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderView();

    fireEvent.click(screen.getByText("Download SVG"));
    await waitFor(() => expect(click).toHaveBeenCalled());

    const blob = createObjectURL.mock.calls[0][0];
    const svg = new DOMParser().parseFromString(await blob.text(), "image/svg+xml").documentElement;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.textContent).toContain("g001");
    expect(svg.querySelector('[data-export="skip"]')).toBeNull();
    expect(click.mock.contexts[0]).toHaveProperty("download", expect.stringMatching(/gpu-allocation_1-hour_.*\.svg$/));
  });

  it("groups the rows by model", () => {
    window.history.replaceState(null, "", "/?level=model");
    const { container } = renderView();
    const labels = [...container.querySelectorAll("svg text")].map((text) => text.textContent);
    expect(labels).toContain("A100");
    expect(labels).not.toContain("g001");
  });

  it("shows a tooltip fixed beside the pointer, which can't make the page longer", () => {
    const { container } = renderView();
    const svg = [...container.querySelectorAll("svg")].find((element) => element.querySelector("[data-export]"))!;
    // into the cluster's row, from where its group is placed (jsdom puts the svg at 0, 0)
    const row = [...svg.querySelectorAll("g")].find((g) => g.firstElementChild?.textContent === "Whole cluster")!;
    const [x, y] = row.getAttribute("transform")!.match(/[\d.]+/g)!.map(Number);
    fireEvent.mouseMove(svg, { clientX: x + 5, clientY: y + 5 });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.position).toBe("fixed");
    expect(tooltip).toHaveTextContent(/^Whole cluster, 16 GPUs/);
    expect(tooltip.textContent).not.toContain("·");
  });
});
