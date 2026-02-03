import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { QueryParameters, buildParameters } from "./useMonitorEndpoint";
import { AxiosError } from "axios";

export interface CPUStatus {
  cpu_avg: number;
  cpu_util: number;
  cpu_time: number;
  time: string;
}

interface NodesCPUStatus {
  [nodename: string]: CPUStatus[]
}

const useCPUStatus = (
  query_parameters: QueryParameters,
  refresh_interval_in_s: number = 60
) => {
  const { endpoint } = useMonitorEndpoint(
        "/nodes/" + query_parameters.nodename + "/cpu/timeseries",
        buildParameters(query_parameters))

  const fetchStatus = async () => {
    const { request } = await endpoint.get<NodesCPUStatus>();

    return request.then<NodesCPUStatus>(({ data }) => {
      return data ? data : ({} as NodesCPUStatus);
    });
  };

  return useQuery<NodesCPUStatus, AxiosError>({
    queryKey: ["nodes", "cpu/timeseries", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s * 1000, // refresh every minute
  });
};

export default useCPUStatus;
