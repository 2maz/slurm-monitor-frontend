import React, { useState } from "react";
import MetaData from "../ResponseMetaData";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

import Node, { getColumns, columnsVisibilityDefault } from "./Node";

interface Props {
  baseUrl: string;
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

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
      <DataGrid
        rows={prepared_data}
        columns={getColumns(prepared_data)}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 50 },
          },
          columns: {
            columnVisibilityModel: columnsVisibilityDefault
          }
        }}
        slots={{
          toolbar: GridToolbar,
        }}
        pageSizeOptions={[10, 50, 100, 250, 500]}
        getRowHeight={() => 30}
      />
    </div>
  );
  return <div>NodeList</div>;
};

export default NodeList;
