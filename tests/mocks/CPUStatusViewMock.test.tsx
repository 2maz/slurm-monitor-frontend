import { render, screen } from '@testing-library/react'
import CPUStatusView from '../../src/components/CPUStatusView/CPUStatusView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock(import('@tanstack/react-query'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      isLoading: true,
      data: undefined,
    }),
  }
});

describe('CPUStatusViewMock', () => {
    const queryClient = new QueryClient();

  const renderComponent = (nodename: string) => {
    render(
      <>
        <QueryClientProvider client={queryClient}>
          <CPUStatusView nodename={nodename} />
        </QueryClientProvider>
      </>
    );
  };
  it("should how loading indicator", async () => {
    renderComponent("n001")

    //const loader = screen.getByRole('progressbar'); // BarLoader renders as a progressbar
    const loaderSpans = document.querySelectorAll('span');
    // Check for the animation style in one of the loader spans
    const hasAnimation = Array.from(loaderSpans).some(span =>
        span.style.animation.includes('react-spinners-BarLoader')
      );
    expect(hasAnimation).toBe(true);
  });
    
})