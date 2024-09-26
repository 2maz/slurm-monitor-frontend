import client from "./client";
import Response from "./response";
import { MONITOR_BASE_URL } from "./client";

interface Params {
    [name: string]: any;
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
    var args =  {}

    args = { ...args, "signal": controller.signal };
    args = { ...args, "params": this.params }

    const request = client.get<T>(this.endpoint, args);
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
