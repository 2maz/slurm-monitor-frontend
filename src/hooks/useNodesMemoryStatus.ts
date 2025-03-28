import { buildParameters, QueryParameters } from "./useCPUStatus";
import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

export interface MemoryStatus {
  memory_resident: number;
  memory_virtual: number;
  memory_util: number;
  timestamp: string;
}

interface NodesMemoryStatus {
  [nodename: string]: MemoryStatus[]
}

interface NodesMemoryStatusTimeseriesResponse extends Response {
  cpu_memory_status: NodesMemoryStatus
}

const useNodesMemoryStatus = (
    query_parameters: QueryParameters,
    refresh_interval_in_s: number = 60
) => {

  const query = "/nodes/"+ query_parameters.nodename + "/cpu_memory_status";
  const { endpoint } = useMonitorEndpoint(query, buildParameters(query_parameters));

  const fetchStatus = async () => {
    const { request } = endpoint.get<NodesMemoryStatusTimeseriesResponse>();

    return request
      .then<NodesMemoryStatus>(({ data }) => {
        return data ? data.cpu_memory_status : {} as NodesMemoryStatus;
      })
  };

  return useQuery<NodesMemoryStatus>({
    queryKey: ["nodes", "cpu_memory_status", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });
}

export default useNodesMemoryStatus;