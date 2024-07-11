import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";

import Partition from "./Partition";
import PartitionsTable from "./PartitionsTable";
import { StateSetters } from "../../services/StateSetters";

const endpoint = new SlurmMonitorEndpoint("/partitions");
interface PartitionsResponse extends Response {
  nodes: Partition[];
}

interface Props {
  stateSetters: StateSetters;
}

const PartitionsView = ({ stateSetters }: Props) => {
  const [error, setError] = useState<Error>();

  const fetchPartitions = async () => {
    const { request, cancel } = endpoint.get();

    return request
      .then(({ data }) => {
        return data ? data.partitions : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const { data } = useQuery({
    queryKey: ["partitions"],
    queryFn: fetchPartitions,
    initialData: [],
  });

  if (data?.length == 0)
    return (
      <>
        <h1 className="mx-5 centered">Partitions</h1>
        {error && (
          <p className="text-danger">No data available: {error.message}</p>
        )}
      </>
    );

  const prepared_data = data.map((node: Partition) => ({
    ...node,
    id: node.name,
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <>
        <PartitionsTable
          data={prepared_data}
          stateSetters={stateSetters}
        />
      </>
    </div>
  );
};

export default PartitionsView;
