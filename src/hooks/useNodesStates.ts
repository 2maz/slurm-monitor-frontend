import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { AxiosError } from "axios";

interface NodeState {
    cluster: string;
    time: string;
    node: string;
    states: string[];

}

const useNodesStates = (time?: Date, refresh_interval_in_s: number = 60
) => {

  let params = {}
  if(time) {
    params = { time_in_s: time.getTime() }
  }
  const { endpoint: endpoint_nodes } = useMonitorEndpoint("/nodes/states", params);

  const fetchNodes = async () => {
    const { request } = await endpoint_nodes.get<NodeState[]>();

    return request
      .then(({ data }) => {
        return data ? data : ([] as NodeState[]);
      })
  };

  return useQuery<NodeState[], AxiosError>({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    refetchInterval: refresh_interval_in_s*1000,
    retry: 10,
    retryDelay: 10*1000,
  });
}

export default useNodesStates;
