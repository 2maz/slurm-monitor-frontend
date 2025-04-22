import axios, { AxiosInstance } from "axios";
import Response from "../services/slurm-monitor/response";
import useAppState from "../AppState";

import { MONITOR_API_PREFIX } from "../services/slurm-monitor/backend.config";

interface Params {
    [name: string]: string | number;
}

class SlurmMonitorEndpoint {
  client: AxiosInstance
  endpoint: string;
  params: Params | undefined

  constructor(client: AxiosInstance, endpoint: string, params? : Params) {
    this.client = client;
    this.endpoint = endpoint;
    this.params = params;
  }

  get<T = Response>() {
    const controller = new AbortController();
    let args =  {}

    args = { ...args, "signal": controller.signal };
    args = { ...args, "params": this.params }

    const request = this.client.get<T>(this.endpoint, args);
    return { request, cancel: () => controller.abort() };
  }
}

const useMonitorEndpoint = (endpoint: string, params?: Params) => {
  const { cluster_id, url: backendUrl } = useAppState().currentBackendSpec()
  const client = axios.create({ baseURL: backendUrl + MONITOR_API_PREFIX + "cluster/" + cluster_id + "/"})

  return {
    endpoint: new SlurmMonitorEndpoint(client, endpoint, params),
  }
}

export default useMonitorEndpoint;
