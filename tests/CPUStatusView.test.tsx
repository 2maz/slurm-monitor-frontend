import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";
import CPUStatusView from "../src/components/CPUStatusView/CPUStatusView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("CPUStatusView", () => {
  let queryClient : QueryClient;

  afterAll(() => {
    vi.resetModules()
  })

  beforeAll(() => {
    queryClient = new QueryClient;
  })

  const nodes = ["n001", "g002"];
  const renderComponent = (nodename: string) => {
    //const queryClient = new QueryClient();
    render(
      <>
        <QueryClientProvider client={queryClient}>
          <CPUStatusView nodename={nodename} />
        </QueryClientProvider>
      </>
    );
  };
  it.each(nodes)("should show '%s' cpu status", async (node) => {
    renderComponent(node);
    await screen.findByText(new RegExp(node));
    await screen.findByText(/percentage/);
    await screen.findByText(/cpu_percent/);
  });
})