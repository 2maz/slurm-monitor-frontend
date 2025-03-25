import { CanceledError } from "axios";

export const DEFAULT_BACKEND_URL = "https://naic-monitor.simula.no:12001";
export const MONITOR_API_PREFIX = "/api/v2/"

export const MONITOR_BASE_URL = DEFAULT_BACKEND_URL + MONITOR_API_PREFIX

export { CanceledError };