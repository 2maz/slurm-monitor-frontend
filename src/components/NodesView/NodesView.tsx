
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Node from "./Node";
import NodesTable from "./NodesTable";


import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";
import { StateSetters } from "../../services/StateSetters";
import MetaData from "../ResponseMetaData";

const endpoint_nodes = new SlurmMonitorEndpoint("/nodes");
const endpoint_gpuinfo = new SlurmMonitorEndpoint("/nodes/info");

interface NodesResponse extends Response {
  nodes: Node[];
}

interface GPUInfo {
  name: string;
  uuid: string;
  local_id: number;
  memory_total: number;
}

interface NodeDataInfo {
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

interface Props {
  stateSetters: StateSetters;
}

const NodesView = ({stateSetters} : Props) => {
  const [error, setError] = useState<Error>();

  const fetchNodes = async () => {
    const { request, cancel } = endpoint_nodes.get();

    return request
      .then(({ data }) => {
        return data ? data.nodes : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const fetchGPUInfos = async () => {
    const { request, cancel } = endpoint_gpuinfo.get();

    return request
      .then(({ data }) => {
        return data ? data.nodes : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const { data } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    initialData: [],
    refetchInterval: 1000*30, // refresh every 30 seconds
  });

  const { data : gpu_infos } = useQuery({
    queryKey: ["nodes", "gpu_infos"],
    queryFn: fetchGPUInfos,
    initialData: {},
    refetchInterval: 1000*3600*24, // refresh daily
  });

  if (data?.length == 0 && gpu_infos?.length == 0)
    return (
      <>
        <h1 className="mx-5 centered">Nodes</h1>
        {error && (
          <>
          <p className="text-danger">No data available: {error.message}</p>
          {endpoint_nodes.selfSignedErrorMessage()}
          </>
        )}
      </>
    );

  const prepared_data = data.map((node: Node) => ({
    ...node,
    gpu_model: gpu_infos[node.name]?.gpus[0].name,
    gpu_memory: gpu_infos[node.name]?.gpus[0].memory_total,
    cpu_model: gpu_infos[node.name]?.cpus?.model,
    id: node.name
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
      <>
        <NodesTable data={prepared_data} stateSetters={stateSetters} />
      </>
    </div>
  );
};

export default NodesView;
