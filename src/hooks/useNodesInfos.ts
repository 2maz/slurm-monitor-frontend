import { useState } from "react";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import { useQuery } from "@tanstack/react-query";
import MetaData from "../components/ResponseMetaData";
import Node from "../components/NodesView/Node";

const endpoint_nodes_info = new SlurmMonitorEndpoint("/nodes/info");

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
  });

};

export default useNodesInfo;