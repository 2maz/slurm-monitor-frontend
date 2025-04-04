import Node, { freeResources, availableGPUs } from "./Node";
import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import Button from "@mui/material/Button";
import { Backdrop, Box, IconButton } from "@mui/material";
import { useMemo, useState } from "react";
import GPUStatusView from "../GPUStatusView";
import CPUStatusView from "../CPUStatusView/CPUStatusView";
import MemoryStatusView from "../CPUStatusView/MemoryStatusView";
import NodeTopology from "./NodeTopology";
import { useNodesStore } from "../../stores";
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  data: Node[];
  maxHeightInViewportPercent?: number
}

const getMaxGPUMemory = (data: Node[]) =>  {
    const maxValue = data.reduce((prev, current) => {
            if(!prev.gpu_memory)
              return current

            if (!current.gpu_memory)
              return prev

            return prev.gpu_memory > current.gpu_memory ? prev : current}
          ).gpu_memory
    return maxValue ? Math.ceil(maxValue / 1024**3) : 0
}
const NodesTable = ({ data, maxHeightInViewportPercent }: Props) => {
  const { columnFilters, setColumnFilters, visibility, setVisibility } = useNodesStore();
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
        accessorFn: (originalRow) => { return originalRow.free_memory ? originalRow.free_memory / 1024.0 : 0 },
        header: "Free Memory (GB)",
        filterVariant: 'range-slider',
        filterFn: 'betweenInclusive',
        muiFilterSliderProps: {
          valueLabelFormat: (value ) => "" + value + " GB",
          min: 0,
          max: Math.ceil(data.reduce((prev, current) => { return prev.free_memory > current.free_memory ? prev : current}).free_memory / 1024),
          size: 'small',
        },
        Cell: ({row}) => {
          return Math.ceil(row.original.free_memory / 1024)
        }
      },
      {
        accessorKey: "cpus",
        accessorFn: (originalRow) => { return Number(originalRow.cpus) },
        filterVariant: 'range-slider',
        filterFn: 'betweenInclusive',
        muiFilterSliderProps: {
          min: 1,
          max: data.reduce((prev, current) => { return prev.cpus > current.cpus ? prev : current}).cpus,
          size: 'small',
        },
        header: "CPUs",
      },
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
        accessorFn: (originalRow) => { return originalRow.gpu_memory ? originalRow.gpu_memory / 1024**3 : 0 },
        header: "GPU Memory (MB)",
        filterVariant: 'range-slider',
        filterFn: 'betweenInclusive',
        muiFilterSliderProps: {
          valueLabelFormat: (value ) => "" + value + " GB",
          min: 0,
          max: getMaxGPUMemory(data),
          size: 'small',
        },
        Cell: ({ row }) => {
          return row.original.gpu_memory ? row.original.gpu_memory / 1024**2 : 0
        }
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
        Cell: ({ cell }) => {
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
      {
        accessorKey: "alloc_cpus",
        accessorFn: (originalRow) => { return Number(originalRow.alloc_cpus) },
        header: "CPUs (allocated)",
        filterVariant: 'range-slider',
        filterFn: 'betweenInclusive',
        muiFilterSliderProps: {
          marks: true,
          min: 1,
          max: data.reduce((prev, current) => { return prev.alloc_cpus > current.alloc_cpus ?  prev : current}).alloc_cpus,
          size: 'small'
        },
        Cell: ({ row }) => {
          const textColor = row.original.cpus == row.original.alloc_cpus ? "text-danger" : "text-normal"
          return <div className={textColor}>
              {row.original.alloc_cpus}
            </div>
        },
      },
      {
        accessorKey: "idle_cpus",
        // for sorting and filtering
        accessorFn: (originalRow) => { return Number(originalRow.idle_cpus) },
        header: "Idle CPUs",
        filterVariant: 'range-slider',
        filterFn: 'betweenInclusive',
        muiFilterSliderProps: {
          min: 0,
          max: data.reduce((prev, current) => { return prev.idle_cpus > current.idle_cpus ? prev : current}).idle_cpus,
          size: 'small'
        },
        // for display
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
    onColumnVisibilityChange: setVisibility,
    state: {
      columnFilters: columnFilters,
      columnVisibility: visibility,
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
      >
        <div className="h-75 bg-white text-muted rounded overflow-auto"
        style={{maxWidth: '90%'}}>
          <Box sx={{ position: 'sticky', top: 0}}>
            <IconButton style={{ float: 'right'}} aria-label="close" onClick={() => {setBackdropToggle(!backdropToggle);}}>
              <CloseIcon />
            </IconButton>
          </Box>
          {data
            .filter((d) => d.name === backdropId)
            .map((d) => {
              return (
                <div key={d.name + "-stats"}>
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
                 <h2>SLURM Node Info</h2>
                 <pre>{JSON.stringify(d, null, 2)}</pre>
                 <h2 title="lstopo-based topology information">Topology</h2>
                 <NodeTopology nodename={d.name} output_format="svg" />
              </div>
              );
            })}
        </div>
      </Backdrop>
    </div>
  );
};

export default NodesTable;
