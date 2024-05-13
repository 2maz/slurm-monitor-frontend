
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Node from "./Node";
import NodesTable from "./NodesTable";


import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";

const endpoint = new SlurmMonitorEndpoint("/nodes");
interface NodesResponse extends Response {
  nodes: Node[];
}

interface Props {
  columnFilters: any
  setColumnFilters: any
}

const NodesView = ({columnFilters, setColumnFilters } : Props) => {
  const [error, setError] = useState<Error>();

  const fetchNodes = async () => {
    const { request, cancel } = endpoint.get();

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

  if (data?.length == 0)
    return (
      <>
        <h1 className="centered">Nodes</h1>
        {error && (
          <p className="text-danger">No data available: {error.message}</p>
        )}
      </>
    );

  const prepared_data = data.map((node: Node) => ({
    ...node,
    id: node.name
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
      <>
        <NodesTable data={prepared_data} columnFilters={columnFilters} setColumnFilters={setColumnFilters} />
      </>
    </div>
  );
};

export default NodesView;
