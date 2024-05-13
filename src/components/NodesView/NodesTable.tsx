import Node, { freeResources, availableGPUs } from "./Node";
import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import Button from "@mui/material/Button";
import { Backdrop } from "@mui/material";
import { useMemo, useState } from "react";

interface Props {
  data: Node[];
  columnFilters: any;
  setColumnFilters: any;
}

const getStringValues = (data: Node[], property_name: keyof Node): string[] => {
  return Array.from([
    ...new Set(data.map((node) => String(node[property_name]))),
  ]).sort();
};

const NodesTable = ({ data, columnFilters, setColumnFilters }: Props) => {
  const columns = useMemo<MRT_ColumnDef<Node>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Job Name",
        //grow: false,
      },
      {
        accessorKey: "architecture",
        header: "Architecture",
        filterVariant: "multi-select",
        filterSelectOptions: [
          ...new Set(data.map((node: Node) => node.architecture)),
        ].sort(),
      },
      {
        accessorKey: "operating_system",
        header: "Operating System",
        filterVariant: "multi-select",
        filterSelectOptions: [
          ...new Set(data.map((node: Node) => node.operating_system)),
        ].sort(),
      },
      { accessorKey: "cores", header: "Cores" },
      {
        accessorKey: "free_memory",
        header: "Free Memory",
      },
      { accessorKey: "cpus", header: "CPUs" },
      { accessorKey: "gres", header: "Resources" },
      {
        accessorKey: "gres_used",
        header: "Used Resources",
        Cell: ({ row, cell }) => {
          const free = freeResources(row.original);
          if (!row.original.gres) return "";

          const textColor = free > 0 ? "text-success" : "text-danger";
          return availableGPUs(row.original) <= 0 ? (
            ""
          ) : (
            <p className={textColor}>
              {cell.getValue<string>()} (unused: {free})
            </p>
          );
        },
      },
      {
        accessorKey: "partitions",
        header: "Partitions",
        Cell: ({ row }) => {
          return row.original.partitions?.join(',');
        },
        filterVariant: "multi-select",
        filterSelectOptions: [
          ...new Set(data.map((node: Node) => node.partitions).flat()),
        ].sort(),
      },
      //{
      //  accessorKey: "burstbuffer_network_address",
      //  header: "BurstBuffer Network Address",
      //},
      //{ accessorKey: "boards", header: "Boards" },
      //{ accessorKey: "boot_time", header: "Boot Time" },
      //{ accessorKey: "comment", header: "Comment" },
      //{ accessorKey: "cpu_binding", header: "CPU Binding" },
      //{ accessorKey: "cpu_load", header: "CPU Load" },
      //{ accessorKey: "extra", header: "Extra",
      //{ accessorKey: "last_busy: number;
      //{ accessorKey: "features: string;
      //{ accessorKey: "active_features: string;
      //{ accessorKey: "gres_drained: string;
      //{ accessorKey: "mcs_label: string;
      //{ accessorKey: "name: string;
      //{ accessorKey: "next_state_after_reboot: string;
      //{ accessorKey: "next_state_after_reboot_flags: string[];
      //{ accessorKey: "address: string;
      //{ accessorKey: "hostname", header: "Hostname" },
      { accessorKey: "state", header: "State" },
      //{ accessorKey: "state_flags: string[];
      //{ accessorKey: "operating_system: string;
      //{ accessorKey: "owner: string;
      //{ accessorKey: "port: number;
      //{ accessorKey: "real_memory: boolean;
      //{ accessorKey: "reason: string;
      //{ accessorKey: "reason_changed_at: number;
      //{ accessorKey: "reason_set_by_user: boolean;
      //{ accessorKey: "slurmd_start_time: number;
      //{ accessorKey: "sockets: number;
      //{ accessorKey: "threads", header: "Threads" },
      //{ accessorKey: "temporary_disk: boolean;
      //{ accessorKey: "weight: number;
      //{ accessorKey: "tres: string;
      //{ accessorKey: "tres_used: string | null;
      //{ accessorKey: "tres_weighted: number;
      //{ accessorKey: "slurmd_version: string;
      { accessorKey: "alloc_memory", header: "Allocated Memory" },
      { accessorKey: "alloc_cpus", header: "Allocated CPUs" },
      { accessorKey: "idle_cpus", header: "Idle CPUs" },
    ],
    [data]
  );

  const [backdropToggle, setBackdropToggle] = useState(false);
  const [backdropId, setBackdropId] = useState("");

  const hasEnabledFilters = () => {
    return (
      columnFilters.filter(
        (filter: { id: string; value: any }) => !filter.id.endsWith("time")
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
      columnOrder: [
        "name",
        "architecture",
        "operating_system",
        "cores",
        "free_memory",
        "cpus",
        "gres",
        "gres_used",
        "partitions",
        "state",
        "alloc_memory",
        "alloc_cpus",
        "idle_cpus",
      ],
    },
    // disable when memo feature is used
    enableDensityToggle: true,
    muiTableBodyRowProps: ({ row }) => ({
      onDoubleClick: (event) => {
        setBackdropToggle(true);
        setBackdropId(row.getValue<string>("name"));
      },
      style: {
        cursor: "pointer", //you might want to change the cursor too when adding an onClick
      },
    }),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
    renderTopToolbarCustomActions: ({ table }) => (
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

export default NodesTable;
