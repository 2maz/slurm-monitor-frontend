import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";


interface CPUStatus {
    cpu_percent: number;
    timestamp: string;
}

interface CPUDataSeries {
    label: string;
    data: CPUStatus[];
}


interface NodesCPUStatus {
  [nodename: string]: CPUDataSeries;
}

interface NodesCPUStatusTimeseriesResponse extends Response {
  cpu_status: NodesCPUStatus
}

interface QueryParameters {
    nodename: string;
    start_time_in_s?: number;
    end_time_in_s?: number;
    resolution_in_s?: number;
}

const useCPUStatus = (query_parameters : QueryParameters, refresh_interval_in_s: number = 60) => {
  var query = "/nodes/"+ query_parameters.nodename + "/cpu_status";

  var parameters = {}
  if(query_parameters.start_time_in_s != undefined) {
      parameters = { ...parameters, "start_time_in_s": query_parameters.start_time_in_s}
  }
  if(query_parameters.end_time_in_s != undefined) {
      parameters = { ...parameters, "end_time_in_s": query_parameters.end_time_in_s }
  }
  if(query_parameters.resolution_in_s != undefined) {
      parameters = { ...parameters, "resolution_in_s": query_parameters.resolution_in_s }
  }

  const endpoint = new SlurmMonitorEndpoint(query, parameters);
  const fetchStatus = async () => {
      const { request } = endpoint.get<NodesCPUStatusTimeseriesResponse>();

      return request
      .then<NodesCPUStatus>(({ data }) => {
          return data ? data.cpu_status : {} as NodesCPUStatus;
      })
  };

  return useQuery<NodesCPUStatus, Error>({
      queryKey: ["nodes", "cpu_status", query_parameters],
      queryFn: fetchStatus,
      refetchInterval: refresh_interval_in_s*1000, // refresh every minute
  });
}

export default useCPUStatus;
