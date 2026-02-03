import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { AxiosError } from "axios";

interface NodesLastSeenResponse {
  [name: string]: string;
}

const useNodesLastSeen = (time?: Date, refresh_interval_in_s: number = 20) => {
  let params = {}
  if(time) {
    params = { time_in_s: time.getTime() }
  }

  const { endpoint: endpoint_nodes } = useMonitorEndpoint("/nodes/last_probe_timestamp", params);

  const fetchNodesLastSeen = async () => {
    const { request } = await endpoint_nodes.get<NodesLastSeenResponse>();

    return request
      .then(({ data }) => {
        return data ? data : {} as NodesLastSeenResponse;
      })
  };

  return useQuery<NodesLastSeenResponse, AxiosError>({
    queryKey: ["nodes", "last_probe"],
    queryFn: fetchNodesLastSeen,
    refetchInterval: refresh_interval_in_s*1000,
    retry: 3,
    retryDelay: 10*1000,
  });
}

export default useNodesLastSeen;
