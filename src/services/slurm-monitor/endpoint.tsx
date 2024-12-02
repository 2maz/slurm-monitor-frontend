import client from "./client";
import Response from "./response";

interface Params {
    [name: string]: string | number;
}

class SlurmMonitorEndpoint {
  endpoint: string;
  params: Params | undefined

  constructor(endpoint: string, params? : Params) {
    this.endpoint = endpoint;
    this.params = params
  }

  get<T = Response>() {
    const controller = new AbortController();
    let args =  {}

    args = { ...args, "signal": controller.signal };
    args = { ...args, "params": this.params }

    const request = client.get<T>(this.endpoint, args);
    return { request, cancel: () => controller.abort() };
  }
}

export default SlurmMonitorEndpoint;
