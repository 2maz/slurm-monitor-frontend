import React, { useState } from "react";
import MetaData from "../ResponseMetaData";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { DataGrid } from "@mui/x-data-grid";

interface Props {
  baseUrl: string;
}

interface Node {
  architecture: string;
  burstbuffer_network_address: string;
  boards: number;
  boot_time: number;
  comment: string;
  cores: number;
  cpu_binding: number;
  cpu_load: number;
  free_memory: number;
  cpus: number;
  features: string;
  active_features: string;
  gres: string;
  gres_drained: string;
  gres_used: string;
  mcs_label: string;
  name: string;
  next_state_after_reboot: string;
  address: string;
  hostname: string;
  state: string;
  operating_system: string;
  owner: string;
  port: number;
  real_memory: boolean;
  reason: string;
  reason_changed_at: number;
  reason_set_by_user: boolean;
  slurmd_start_time: number;
  sockets: number;
  threads: number;
  temporary_disk: boolean;
  weight: number;
  tres: string;
  slurmd_version: string;
}

interface NodesResponse {
  meta: MetaData;
  errors: string[];
  nodes: Node[];
}

const NodeList = ({ baseUrl }: Props) => {
  const [error, setError] = useState<Error>();

  const fetchNodes = () =>
    axios
      .get<NodesResponse>(baseUrl + "nodes")
      .then(({ data }) => {
        return data?.nodes;
      })
      .catch((error) => {
        setError(error);
        return [];
      });

  const { data } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    initialData: [],
    refetchInterval: 1000 * 60 * 60 * 24,
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

  const prepared_data = data.map((node) => ({ ...node, id: node.name }));
  const columns = [
    {
      field: "name",
      headerName: "Name",
      description: "Node Name",
      width: 120,
    },
    {
      field: "architecture",
      headerName: "Architecture",
      width: 130,
      type: "singleSelect",
      valueOptions: [
        ...new Set(prepared_data.map((node) => node.architecture)),
      ].sort(),
    },
    {
      field: "operating_system",
      headerName: "Operating System",
      width: 130,
      type: "singleSelect",
      valueOptions: [
        ...new Set(prepared_data.map((node) => node.operating_system)),
      ].sort(),
    },
    { field: "cores", headerName: "Cores", width: 130 },
    {
      field: "free_memory",
      headerName: "Free Memory",
      width: 130,
    },
    { field: "cpus", headerName: "CPUs", width: 130 },
    { field: "gres", headerName: "Resources", width: 130 },
    { field: "gres_used", headerName: "Used Resources", width: 130 },
  ];

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
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
  return <div>NodeList</div>;
};

export default NodeList;
