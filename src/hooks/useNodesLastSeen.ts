import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { AxiosError } from "axios";

interface NodesLastSeenResponse {
  [name: string]: string;
}

const useNodesLastSeen = (time?: Date) => {
  let params = {}
  if(time) {
    params = { time_in_s: time.getTime() }
  }

  const { endpoint: endpoint_nodes } = useMonitorEndpoint("/nodes/last_probe_timestamp", params);

  const fetchNodesLastSeen = async () => {
    const { request } = endpoint_nodes.get<NodesLastSeenResponse>();

    return request
      .then(({ data }) => {
        return data ? data : {} as NodesLastSeenResponse;
      })
  };

  return useQuery<NodesLastSeenResponse, AxiosError>({
    queryKey: ["nodes", "last_probe"],
    queryFn: fetchNodesLastSeen,
    refetchInterval: 5*1000, // refresh every 5 mins 
    retry: 3,
    retryDelay: 1000*3,
  });
}

export default useNodesLastSeen;
