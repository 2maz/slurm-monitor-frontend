import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

const useNodesTopology = (node: string, output_format: string) => {
  const { endpoint } = useMonitorEndpoint("/nodes/" + node + "/topology?output_format="+output_format);

  const fetchNodesTopology = async () => {
    const { request } = endpoint.get<string>();

    return request
      .then((response) => {
        return response.data
      })
  };

  return useQuery<string, Error>({
    queryKey: ["nodes", node, "topology"],
    queryFn: fetchNodesTopology,
    retry: 3,
    retryDelay: 1000*3,
    staleTime: 24*3600*60, // refresh once per day
  });
}

export const useNodesTopologyURL = (node: string, output_format: string) => {
  const { endpoint } = useMonitorEndpoint("")
  const topology_ref = "/nodes/" + node + "/topology?output_format="+output_format
  return endpoint.client.getUri() + topology_ref

}

export default useNodesTopology;
