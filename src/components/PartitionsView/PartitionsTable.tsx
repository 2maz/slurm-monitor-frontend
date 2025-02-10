import { useMemo, useState } from "react";
import "./PartitionList.module.css";
import Partition from "./Partition";
import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Backdrop, Button } from "@mui/material";
import { StateSetters } from "../../services/StateSetters";

interface Props {
  data: Partition[];
  stateSetters: StateSetters;
  maxHeightInViewportPercent?: number
}

const PartitionsTable = ({ data, stateSetters, maxHeightInViewportPercent }: Props) => {
  const columns = useMemo<MRT_ColumnDef<Partition>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "nodes",
        header: "Nodes",
      },
      {
        accessorKey: "total_cpus",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 1,
          max: data.reduce((prev, current) => { return prev.total_cpus > current.total_cpus ? prev : current}).total_cpus,
          size: 'small',
        },
        header: "Total CPUs"
      },
      {
        accessorKey: "total_nodes",
        header: "Total Nodes" ,
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 1,
          max: data.reduce((prev, current) => { return prev.total_nodes > current.total_nodes ? prev : current}).total_nodes,
          size: 'small',
        },
      },
      { accessorKey: "flags", header: "Flags" },
      { accessorKey: "maximum_cpus_per_job", header: "Max CPU/Jobs" },
      { accessorKey: "maximum_nodes_per_job", header: "Max Nodes/Jobs" },
      { accessorKey: "maximum_memory_per_job", header: "Max Memory/Jobs" },
      { accessorKey: "max_time_limit", header: "Max Time Limit" },
      { accessorKey: "nodes_online", header: "Nodes Online" },
    ],
    [data]
  );

  const [backdropToggle, setBackdropToggle] = useState(false);
  const [backdropId, setBackdropId] = useState("");

  const [columnFilters, setColumnFilters] = stateSetters.columnFilters;
  const [columnVisibility, setColumnVisibility] = stateSetters.columnVisibility;

  const hasEnabledFilters = () => {
    return (
      columnFilters.filter(
        (filter: { id: string; value: unknown }) => !filter.id.endsWith("time")
      ).length > 0
    );
  };

  const table = useMaterialReactTable({
    columns: columns,
    data: data, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
    //layoutMode: "grid-no-grow",
    //enableColumnResizing: true,
    enableGrouping: true,
    enableStickyHeader: true,
    //enableStickyFooter: true
    enablePagination: false,
    // row virtualization helps to render only the visual data
    enableRowVirtualization: true,
    initialState: {
      density: "compact",
      showColumnFilters: hasEnabledFilters(),
    },
    // disable when memo feature is used
    enableDensityToggle: true,
    muiTableContainerProps: () => ({
      sx: {
        maxHeight: maxHeightInViewportPercent ? "" + maxHeightInViewportPercent + "vh" : "100vh"
      }
    }),
    muiTableBodyRowProps: ({ row }) => ({
      onDoubleClick: (/*event*/) => {
        setBackdropToggle(true);
        setBackdropId(row.getValue<string>("name"));
      },
      style: {
        cursor: "pointer", //you might want to change the cursor too when adding an onClick
      },
    }),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnFilters,
      columnVisibility,
    },
    renderTopToolbarCustomActions: (/*{ table }*/) => (
      <div className="d-flex">
        <Button onClick={resetState}>Reset Filters</Button>
      </div>
    ),
  });

  const resetState = () => {
    setColumnFilters([]);
  };

  return (
    <div>
      <MaterialReactTable table={table} />

      <Backdrop
        sx={{ color: "#aaa", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropToggle}
        onClick={() => {
          setBackdropToggle(!backdropToggle);
        }}
      >
        <div className="h-75 bg-white text-muted rounded overflow-auto">
          {data
            .filter((d) => d.name === backdropId)
            .map((d) => {
              return (
                <div key={d.name} className="mx-3 my-3">
                  <pre>{JSON.stringify(d, null, 2)}</pre>
                </div>
              );
            })}
        </div>
      </Backdrop>
    </div>
  );
};

export default PartitionsTable;
