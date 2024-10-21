import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import { useState } from "react";

import Node from "../components/NodesView/Node";

export const endpoint_nodes = new SlurmMonitorEndpoint("/nodes");

interface NodesResponse extends Response {
  nodes: Node[];
}

const useNodes = () => {
  const fetchNodes = async () => {
    const { request } = endpoint_nodes.get<NodesResponse>();

    return request
      .then(({ data }) => {
        return data ? data.nodes : [];
      })
  };

  return useQuery<Node[], Error>({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    initialData: [],
    refetchInterval: 1000*30, // refresh every 30 seconds
  });
}

export default useNodes;
