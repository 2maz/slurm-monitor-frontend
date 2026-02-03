import { useQuery } from "@tanstack/react-query";
import Node from "../components/NodesView/Node";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface NodesResponse extends Response {
  nodes: Node[];
}

const useNodes = (
    refresh_interval_in_s: number = 60
) => {
  const { endpoint: endpoint_nodes } = useMonitorEndpoint("/nodes");

  const fetchNodes = async () => {
    const { request } = await endpoint_nodes.get<NodesResponse>();

    return request
      .then(({ data }) => {
        return data ? data.nodes : [];
      })
  };

  return useQuery<Node[], Error>({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    refetchInterval: refresh_interval_in_s*1000,
    retry: 10,
    retryDelay: 10*1000,
  });
}

export default useNodes;
