import { CanceledError } from "axios";

export const DEFAULT_BACKEND_URL = "https://srl-login3.ex3.simula.no:12000";
export const MONITOR_API_PREFIX = "/api/v1/monitor/";

export const MONITOR_BASE_URL = DEFAULT_BACKEND_URL + MONITOR_API_PREFIX

export { CanceledError };