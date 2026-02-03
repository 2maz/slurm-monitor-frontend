import { useQuery } from "@tanstack/react-query";
import MetaData from "../components/ResponseMetaData";
import useMonitorEndpoint from "./useMonitorEndpoint";

export interface CPUInfo {
  architecture: string;
  cpu_model: string;
  sockets: number;
  cores_per_socket: number;
  threads_per_core: number;
}

export interface GPUInfo {
  uuid: string;
  manufacturer: string;
  model: string,
  architecture: string;
  memory: number;
  last_active: string;
}

export interface NodeDataInfo extends CPUInfo{
  cluster: string;
  node: string;
  partitions: string[];
  os_name: string;
  os_release: string;
  memory: number;
  topo_svg?: string | undefined;
  alloc_tres: { cpu: number, memory: number, billing: number, gpu: number};

  cards: GPUInfo[];

  errors: string[];
  meta: MetaData;
  time: string;
}

interface NodeInfos {
  [name: string]: NodeDataInfo;
}

const useNodesInfo = (time?: Date, refresh_interval_in_s: number = 60 ) => {
  let params = {}
  if(time) {
    params = { time_in_s: time.getTime() }
  }
  const { endpoint : endpoint_nodes_info } = useMonitorEndpoint("/nodes/info", params);

  const fetchNodeInfos = async () => {
    const { request } = await endpoint_nodes_info.get<Record<string, NodeDataInfo>>();

    return request
      .then(({ data }) => {
        return data ? data : {} as NodeInfos;
      })
  };

  return useQuery<NodeInfos | undefined, Error>({
    queryKey: ["cluster", "nodes", "info"],
    queryFn: fetchNodeInfos,
    refetchInterval: refresh_interval_in_s*1000,
    retry: 3,
    retryDelay: 10*1000,
  });

};

export default useNodesInfo;