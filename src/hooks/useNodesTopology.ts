import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { AxiosError } from "axios";

const useNodesTopology = (node: string, output_format: string) => {
  const { endpoint } = useMonitorEndpoint("/nodes/" + node + "/topology?output_format="+output_format);

  const fetchNodesTopology = async () => {
    const { request } = endpoint.get<string>();

    return request
      .then((response) => {
        return response.data
      })
  };

  return useQuery<string, AxiosError>({
    queryKey: ["nodes", node, "topology"],
    queryFn: fetchNodesTopology,
    retry: 1,
    retryDelay: 1000*3,
  });
}

export const useNodesTopologyURL = (node: string, output_format: string) => {
  const { endpoint } = useMonitorEndpoint("")
  const topology_ref = "/nodes/" + node + "/topology?output_format="+output_format
  return endpoint.client.getUri() + topology_ref

}

export default useNodesTopology;
