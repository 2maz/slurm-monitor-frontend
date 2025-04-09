import { useQuery } from "@tanstack/react-query";
import MetaData from "../components/ResponseMetaData";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface CPUInfo {
  architecture: string;
  cpu_model: string;
  sockets: number;
  cores_per_socket: number;
  threads_per_core: number;
}

interface GPUInfo {
  uuid: string;
  manufacturer: string;
  model: string,
  architecture: string;
  memory: number;
}

export interface NodeDataInfo extends CPUInfo{
  cluster: string;
  node: string;
  partitions: string[];
  os_name: string;
  os_release: string;
  memory: number;
  topo_svg?: string | undefined;

  cards: GPUInfo[];

  errors: string[];
  meta: MetaData;
}

interface NodeInfos {
  [name: string]: NodeDataInfo;
}

const useNodesInfo = (time: Date | undefined) => {
  let params = {}
  if(time) {
    params = { time_in_s: time.getTime() }
  }
  const { endpoint : endpoint_nodes_info } = useMonitorEndpoint("/nodes/info", params);

  const fetchNodeInfos = async () => {
    const { request } = endpoint_nodes_info.get<Record<string, NodeDataInfo>>();

    return request
      .then(({ data }) => {
        return data ? data : {} as NodeInfos;
      })
  };

  return useQuery<NodeInfos | undefined, Error>({
    queryKey: ["cluster", "nodes", "info"],
    queryFn: fetchNodeInfos,
    refetchInterval: 1000*3600*24, // refresh daily
    retry: 3,
    retryDelay: 1000*3,
  });

};

export default useNodesInfo;