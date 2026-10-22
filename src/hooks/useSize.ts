import { RefCallback, useCallback, useRef, useState } from "react";

// An element's size, kept up to date as it resizes. A ref callback, so it
// follows the element when React replaces it.
const useSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const element = useRef<HTMLDivElement | null>(null);
  const ref: RefCallback<HTMLDivElement> = useCallback((current: HTMLDivElement | null) => {
    element.current = current;
    if (!current) return;
    const observer = new ResizeObserver(() => setSize({ width: current.clientWidth, height: current.clientHeight }));
    observer.observe(current);
    return () => observer.disconnect();
  }, []);
  return [ref, size, element] as const;
};

export default useSize;
