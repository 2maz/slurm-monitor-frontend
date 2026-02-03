import axios, { AxiosInstance } from "axios";
import Response from "../services/slurm-monitor/response";
import useAppState from "../AppState";

import keycloak, { auth_required } from "../auth";

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

  async get<T = Response>() {
    try {
      if(auth_required()) {
        if(keycloak.didInitialize) {
          await keycloak.updateToken(30);
        }
      }
    } catch(error)
    {
      console.error('Failed to refresh token:', error)
    }

    const controller = new AbortController();
    let args =  {}

    args = { ...args, "signal": controller.signal };
    args = { ...args, "params": this.params };

    if(auth_required()) {
      args = { ...args, "headers": {
        accept: 'application/json',
        Authorization: `Bearer ${keycloak.token}`
        }
      }
    }

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

export const useMonitorBaseEndpoint = (endpoint: string, params?: Params) => {
  const { url: backendUrl } = useAppState().currentBackendSpec()
  const client = axios.create({ baseURL: backendUrl + MONITOR_API_PREFIX + "/"})

  return {
    endpoint: new SlurmMonitorEndpoint(client, endpoint, params),
  }
}

export interface QueryParameters {
  nodename: string;
  start_time_in_s?: number;
  end_time_in_s?: number;
  resolution_in_s?: number;
}

export const buildParameters = (query_parameters: QueryParameters) => {
  let parameters = {};
  if (query_parameters.start_time_in_s != undefined) {
    parameters = {
      ...parameters,
      start_time_in_s: query_parameters.start_time_in_s,
    };
  }
  if (query_parameters.end_time_in_s != undefined) {
    parameters = {
      ...parameters,
      end_time_in_s: query_parameters.end_time_in_s,
    };
  }
  if (query_parameters.resolution_in_s != undefined) {
    parameters = {
      ...parameters,
      resolution_in_s: query_parameters.resolution_in_s,
    };
  }
  return parameters;
}

export default useMonitorEndpoint;
