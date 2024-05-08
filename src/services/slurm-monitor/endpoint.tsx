import client from "./client";
import Response from "./response";

class SlurmMonitorEndpoint {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  get() {
    const controller = new AbortController();
    const request = client.get< Response >(this.endpoint, {
      signal: controller.signal,
    });
    return { request, cancel: () => controller.abort() };
  }
}

export default SlurmMonitorEndpoint;
