import { CanceledError } from "axios";

const SLURM_MONITOR_RESTAPI_PORT = (import.meta.env.SLURM_MONITOR_RESTAPI_PORT || 12200) as number;
const SLURM_MONITOR_RESTAPI_HOST = (import.meta.env.SLURM_MONITOR_RESTAPI_HOST || "https://naic-monitor.simula.no") as string;
export const DEFAULT_BACKEND_URL = SLURM_MONITOR_RESTAPI_HOST + ":" + SLURM_MONITOR_RESTAPI_PORT;
export const MONITOR_API_PREFIX = "/api/v2/"

export const MONITOR_BASE_URL = DEFAULT_BACKEND_URL + MONITOR_API_PREFIX

export { CanceledError };