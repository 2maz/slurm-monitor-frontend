import Node, { freeResources, availableGPUs } from "./Node";
import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import Button from "@mui/material/Button";
import { Backdrop } from "@mui/material";
import { useMemo, useState } from "react";
import { StateSetters } from "../../services/StateSetters";
import GPUStatusView from "../GPUStatusView";
import CPUJobStatusView from "../CPUStatusView";
import CPUStatusView from "../CPUStatusView/CPUStatusView";
import MemoryStatusView from "../CPUStatusView/MemoryStatusView";

interface Props {
  data: Node[];
  stateSetters: StateSetters;
}

const getStringValues = (data: Node[], property_name: keyof Node): string[] => {
  return Array.from([
    ...new Set(data.map((node) => String(node[property_name]))),
  ]).sort();
};

const NodesTable = ({ data, stateSetters }: Props) => {
  const columns = useMemo<MRT_ColumnDef<Node>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Node Name",
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
        grow: 1
      },
      { accessorKey: "cores", header: "Cores" },
      {
        accessorKey: "free_memory",
        header: "Free Memory (MB)",
      },
      { accessorKey: "cpus", header: "CPUs", },
      { accessorKey: "cpu_model", header: "CPU Model", },
      {
        accessorKey: "gres",
        header: "General Resources",
        grow: 1
      },
      {
        accessorKey: "gpu_model",
        header: "GPU Model",
        Cell: ({ cell }) => {
          const value = cell.getValue<string>()
          return <div title={value}>{value}</div>
        }
      },
      {
        accessorKey: "gpu_memory",
        header: "GPU Memory (MB)",
      },
      {
        accessorKey: "gres_used",
        header: "Resources (Status)",
        Cell: ({ row, cell }) => {
          const free = freeResources(row.original);
          if (!row.original.gres) return "";

          const textColor = free > 0 ? "text-success" : "text-danger";
          const titleText = free > 0 ? free + " GPUs are available" : "No GPU available";
          return availableGPUs(row.original) <= 0 ? (
            ""
          ) : (
            <div className={textColor} title={titleText}>
              {cell.getValue<string>()} (unused: {free})
            </div>
          );
        },
        grow: 1
      },
      {
        accessorKey: "partitions",
        header: "Partitions",
        Cell: ({ row }) => {
          return row.original.partitions?.join(",");
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
      {
        accessorKey: "state",
        header: "State",
        filterVariant: "multi-select",
        filterSelectOptions: [
          ...new Set(data.map((node: Node) => node.state)),
        ].sort(),
        Cell: ({ row, cell }) => {
          if(cell.getValue() == "down")
            return (
            <div className="text-danger">
              {cell.getValue<string>()} &#x26a0;
            </div>
          )
          return cell.getValue<string>();
        },
      },
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
      { accessorKey: "alloc_cpus",
        header: "CPUs (allocated)",
        Cell: ({ row }) => {
          const textColor = row.original.cpus == row.original.alloc_cpus ? "text-danger" : "text-normal"
          return <div className={textColor}>
              {row.original.alloc_cpus}
            </div>
        },
      },
      { accessorKey: "idle_cpus", header: "Idle CPUs",
        Cell: ({ row }) => {
          const textColor = 0 == row.original.idle_cpus ? "text-danger" : "text-normal"
          const titleText = 0 == row.original.idle_cpus ? "Currently no remaining cpus" : row.original.idle_cpus + " available CPUs"
          return <div className={textColor} title={titleText}>
              {row.original.idle_cpus}
            </div>
        },
       },
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
        (filter: { id: string; value: any }) => !filter.id.endsWith("time")
      ).length > 0
    );
  };

  const table = useMaterialReactTable({
    columns: columns,
    data: data, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
    //layoutMode: "grid-no-grow",
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableGrouping: true,
    enableStickyHeader: true,
    //enableStickyFooter: true
    enablePagination: false,
    // row virtualization helps to render only the visual data
    //enableRowVirtualization: true,
    enableColumnVirtualization: true,
    initialState: {
      density: "compact",
      showColumnFilters: hasEnabledFilters(),
      columnOrder: [
        "name",
        "architecture",
        "cpus",
        "cpu_model",
        "idle_cpus",
        "gres",
        "gpu_model",
        "gpu_memory",
        "gres_used",
        "free_memory",
        "partitions",
        "state",
        "operating_system",
        "alloc_memory",
        "alloc_cpus",
        "cores",
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
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnFilters,
      columnVisibility,
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
                <>
                <div key={d.name + "-cpu"} className="mx-3 my-3">
                <h2>CPU Status (accumulated)</h2>
                <CPUStatusView nodename={d.name}/>
                </div>
                <div key={d.name + "-memory"} className="mx-3 my-3">
                <h2>Memory Status</h2>
                <MemoryStatusView nodename={d.name}/>
                </div>
                <div key={d.name + "-gpu"} className="mx-3 my-3">
                <h2>GPU Status</h2>
                  <GPUStatusView nodename={d.name}/>
                </div>

                  <pre>{JSON.stringify(d, null, 2)}</pre>
              </>
              );
            })}
        </div>
      </Backdrop>
    </div>
  );
};

export default NodesTable;
