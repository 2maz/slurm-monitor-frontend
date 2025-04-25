import { buildParameters, QueryParameters } from "./useCPUStatus";
import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

export interface MemoryStatus {
  memory_resident: number;
  memory_virtual: number;
  memory_util: number;
  time: string;
}

interface NodesMemoryStatus {
  [nodename: string]: MemoryStatus[]
}

const useNodesMemoryStatus = (
    query_parameters: QueryParameters,
    refresh_interval_in_s: number = 60
) => {

  const query = "/nodes/"+ query_parameters.nodename + "/memory/timeseries";
  const { endpoint } = useMonitorEndpoint(query, buildParameters(query_parameters));

  const fetchStatus = async () => {
    const { request } = endpoint.get<NodesMemoryStatus>();

    return request
      .then<NodesMemoryStatus>(({ data }) => {
        return data ? data : {} as NodesMemoryStatus;
      })
  };

  return useQuery<NodesMemoryStatus>({
    queryKey: ["nodes", "memory/timeseries", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });
}

export default useNodesMemoryStatus;