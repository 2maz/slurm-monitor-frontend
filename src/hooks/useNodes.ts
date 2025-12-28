import { useQuery } from "@tanstack/react-query";
import Node from "../components/NodesView/Node";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface NodesResponse extends Response {
  nodes: Node[];
}

const useNodes = () => {
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
    refetchInterval: 30*1000, // refresh every 30 seconds
    retry: 3,
    retryDelay: 1000*3,
  });
}

export default useNodes;
