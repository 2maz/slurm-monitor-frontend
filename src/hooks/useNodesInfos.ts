import { useQuery } from "@tanstack/react-query";
import MetaData from "../components/ResponseMetaData";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface CPUInfo {
  model: string;
  count: number;
}

interface GPUInfo {
  model: string,
  node: string;
  uuid: string;
  local_id: number;
  memory_total: number;
}

interface NodeDataInfo {
  cpus: CPUInfo;
  gpus: GPUInfo[];
  errors: string[]
  meta: MetaData
}

interface NodeInfos {
  [name: string]: NodeDataInfo;
}

interface NodeInfoResponse extends Response {
  nodes: NodeInfos
}

const useNodesInfo = () => {
  const { endpoint : endpoint_nodes_info } = useMonitorEndpoint("/nodes/info");

  const fetchNodeInfos = async () => {
    const { request } = endpoint_nodes_info.get<NodeInfoResponse>();

    return request
      .then(({ data }) => {
        return data ? data.nodes : {} as NodeInfos;
      })
  };

  return useQuery<NodeInfos | undefined, Error>({
    queryKey: ["nodes", "info"],
    queryFn: fetchNodeInfos,
    refetchInterval: 1000*3600*24, // refresh daily
    retry: 3,
    retryDelay: 1000*3,
  });

};

export default useNodesInfo;