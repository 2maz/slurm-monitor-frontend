import { useCallback, useState } from "react";

const currentParams = () => new URLSearchParams(window.location.search);

/**
 * Sets search params of the current URL, removing those set to undefined, and
 * with `only` all others than those listed. Replaces the history entry rather
 * than adding one, so that changing settings doesn't fill up the back button.
 */
export const setUrlParams = (params: Record<string, string | undefined>, { only }: { only?: string[] } = {}) => {
  const url = new URL(window.location.href);
  if (only) [...url.searchParams.keys()].filter((key) => !only.includes(key)).forEach((key) => url.searchParams.delete(key));
  Object.entries(params).forEach(([key, value]) =>
    value === undefined ? url.searchParams.delete(key) : url.searchParams.set(key, value),
  );
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
};

export const getUrlParam = (key: string) => currentParams().get(key) ?? undefined;

/**
 * A setting kept in the URL's search params, e.g. ?level=model, so that a
 * refresh keeps it and a link shares it. Starts from the URL where `isValid`
 * accepts its value, else from the default, which is left out of the URL.
 */
const useUrlParam = (key: string, defaultValue: string, isValid: (value: string) => boolean = () => true) => {
  const [value, setValue] = useState(() => {
    const fromUrl = getUrlParam(key);
    return fromUrl !== undefined && isValid(fromUrl) ? fromUrl : defaultValue;
  });
  const set = useCallback(
    (next: string) => {
      setValue(next);
      setUrlParams({ [key]: next === defaultValue ? undefined : next });
    },
    [key, defaultValue],
  );
  return [value, set] as const;
};

/** A switch kept in the URL as 1 or 0, like useUrlParam. */
export const useUrlFlag = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useUrlParam(key, defaultValue ? "1" : "0", (value) => value === "1" || value === "0");
  const set = useCallback((next: boolean) => setValue(next ? "1" : "0"), [setValue]);
  return [value === "1", set] as const;
};

export default useUrlParam;
