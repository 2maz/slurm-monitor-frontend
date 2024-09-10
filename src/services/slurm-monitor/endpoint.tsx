import client from "./client";
import Response from "./response";
import { MONITOR_BASE_URL } from "./client";

class SlurmMonitorEndpoint {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  get<T = Response>() {
    const controller = new AbortController();
    const request = client.get<T>(this.endpoint, {
      signal: controller.signal,
    });
    return { request, cancel: () => controller.abort() };
  }


  selfSignedErrorMessage() {
    return <div>
      This might be a self-signed certificate issue.
      Go to <a href={MONITOR_BASE_URL}>{MONITOR_BASE_URL}</a> 
      and if you are warned about a self-signed certificate exception, add a permanent exception for this site.
    </div>
  }
};

export default SlurmMonitorEndpoint;
