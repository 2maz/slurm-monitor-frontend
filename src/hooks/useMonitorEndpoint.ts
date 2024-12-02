import axios, { AxiosInstance } from "axios";
import Response from "../services/slurm-monitor/response";
import useAppState from "../AppState";

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

const useMonitorEndpoint = (endpoint: string, params?: Params | undefined) => {
  const backendUrl = useAppState((state) => state.backendUrl);
  const client = axios.create({ baseURL: backendUrl + "/api/v1/monitor"})

  return {
    endpoint: new SlurmMonitorEndpoint(client, endpoint, params),
  }
}

export default useMonitorEndpoint;
