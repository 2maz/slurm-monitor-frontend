import React, { useEffect, useRef, useState } from "react";
import "./PartitionList.module.css";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { DataGrid } from "@mui/x-data-grid";
import MetaData from "../ResponseMetaData";

interface Props {
  baseUrl: string;
}

interface Partition {
  flags: string[];
  preemption_mode: string[];
  allowed_allocation_nodes: string;
  allowed_accounts: string;
  allowed_groups: string;
  allowed_qos: string;
  alternative: string;
  billing_weights: string;
  default_memory_per_cpu: number;
  default_time_limit: number;
  denied_accounts: string;
  denied_qos: string;
  preemption_grace_time: number;
  maximum_cpus_per_node: number;
  maximum_memory_per_node: number;
  maximum_nodes_per_job: number;
  max_time_limit: number;
  min_nodes_per_job: number;
  name: string;
  nodes: string;
  over_time_limit: string;
  priority_job_factor: number;
  priority_tier: number;
  qos: string;
  nodes_online: number;
  total_cpus: number;
  total_nodes: number;
  tres: string;
}

interface PartitionsResponse {
  meta: MetaData;
  errors: string[];
  partitions: Partition[];
}

const PartitionList = ({ baseUrl }: Props) => {
  const [error, setError] = useState<Error>();

  const fetchPartitions = () =>
    axios
      .get<PartitionsResponse>(baseUrl + "partitions")
      .then(({ data }) => {
        return data?.partitions;
      })
      .catch((error) => {
        setError(error);
        return [];
      });

  const { data } = useQuery({
    queryKey: ["partitions"],
    queryFn: fetchPartitions,
    initialData: [],
    refetchInterval: 1000*60*60*24,
  });

  if (data?.length == 0)
    return (
      <>
        <h1 className="centered">Partitions</h1>
        {error && (
          <p className="text-danger">No data available: {error.message}</p>
        )}
      </>
    );

  const prepared_data = data.map((partition) => ({ ...partition, id: partition.name }));
  const columns = [
    {
      field: "name",
      headerName: "Name",
      description: "Partition Name",
      width: 120,
    },
    {
      field: "nodes",
      headerName: "Nodes",
      description: "Nodes associated with this partition",
      width: 150,
    },
    { field: "total_cpus", headerName: "Total CPUs", width: 130 },
    { field: "total_nodes", headerName: "Total Nodes", width: 130 },
    { field: "flags", headerName: "Flags", width: 130 },
    { field: "maximum_cpus_per_job", headerName: "Max CPU/Jobs", width: 130 },
    { field: "maximum_nodes_per_job", headerName: "Max Nodes/Jobs", width: 130 },
    { field: "maximum_memory_per_job", headerName: "Max Memory/Jobs", width: 130 },
    { field: "max_time_limit", headerName: "Max Time Limit", width: 130 },
    { field: "nodes_online", headerName: "Nodes Online", width: 130 },
  ];

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <DataGrid
        rows={prepared_data}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 50 },
          },
        }}
        pageSizeOptions={[10, 50, 100, 250, 500]}
        getRowHeight={() => 30}
      />
    </div>
  );
};

export default PartitionList;
