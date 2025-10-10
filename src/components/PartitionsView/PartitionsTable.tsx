import { useMemo, useState } from "react";
import "./PartitionList.module.css";
import Partition from "./Partition";
import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Backdrop, Box, Button, IconButton } from "@mui/material";
import { usePartitionsStore } from "../../stores";
import CloseIcon from '@mui/icons-material/Close';
import { DateTime } from "luxon";

interface Props {
  data: Partition[];
  maxHeightInViewportPercent?: number
}

const ensure_value = (value: number | undefined) => {
  if(value) {
    return value
  }
  return 0
}

const delta_seconds_to_now = (timestamp: number | string | undefined) => {
  if(timestamp) {
      let epoch = 0
      if(typeof timestamp == 'string') {
        epoch = DateTime.fromISO(timestamp).toJSDate().getUTCSeconds()
      } else {
        epoch = timestamp
      }
      const delta_seconds = (Date.now()/1000.0 - epoch);
      return delta_seconds / 60
  }
  return 0
}

const PartitionsTable = ({ data, maxHeightInViewportPercent }: Props) => {
  const { columnFilters, setColumnFilters, visibility, setVisibility } = usePartitionsStore()
  const columns = useMemo<MRT_ColumnDef<Partition>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "nodes_compact",
        header: "Nodes",
      },
      {
        accessorKey: "total_cpus",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.total_cpus > current.total_cpus ? prev : current}).total_cpus,
          size: 'small',
        },
        header: "Total CPUs"
      },
      {
        accessorKey: "total_gpus",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0: data.reduce((prev, current) => { return prev.total_gpus > current.total_gpus ? prev : current}).total_gpus,
          size: 'small',
        },
        header: "Total GPUs"
      },
      {
        accessorKey: "gpus_in_use",
        accessorFn: (row) => row.gpus_in_use.length,
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.gpus_in_use.length > current.gpus_in_use.length ? prev : current}).gpus_in_use.length,
          size: 'small',
        },
        header: "GPUs in use"
      },
      {
        accessorKey: "gpus_reserved",
        accessorFn: (row) => row.gpus_reserved,
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.gpus_reserved > current.gpus_reserved ? prev : current}).gpus_reserved,
          size: 'small',
        },
        header: "GPUs reserved"
      },
      {
        accessorKey: "total_nodes",
        header: "Total Nodes" ,
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.total_nodes > current.total_nodes ? prev : current}).total_nodes,
          size: 'small',
        },
      },
      {
        accessorKey: "jobs_pending",
        accessorFn: (originalRow) => { return originalRow.jobs_pending ? originalRow.jobs_pending.length : 0 },
        header: "Pending Jobs",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 1,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.jobs_pending!.length > current.jobs_pending!.length ? prev : current}).jobs_pending!.length,
          size: 'small',
        },
        Cell: ({row}) => { return row.original.jobs_pending!.length }
      },
      {
        accessorKey: "jobs_running",
        accessorFn: (originalRow) => { return originalRow.jobs_running ? originalRow.jobs_running.length : 0 },
        header: "Running Jobs",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : data.reduce((prev, current) => { return prev.jobs_running!.length > current.jobs_running!.length ? prev : current}).jobs_running!.length,
          size: 'small',
        },
        Cell: ({row}) => { return row.original.jobs_running!.length }
      },
      {
        accessorKey: "pending_max_submit_time",
        accessorFn: (originalRow) => {
          if(originalRow.jobs_pending?.length == 0) {
            return 0
          }
          return delta_seconds_to_now(originalRow.pending_max_submit_time) / 60 // in minutes
        },
        header: "Max wait in pending",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : Math.ceil(delta_seconds_to_now(data.reduce(
                (prev, current) => {
                  if(prev.jobs_pending?.length == 0) {
                    return prev
                  }
                  if(prev.pending_max_submit_time && current.pending_max_submit_time) {
                    return prev.pending_max_submit_time < current.pending_max_submit_time ? prev : current
                  } else if(prev.pending_max_submit_time) {
                    return prev
                  } else {
                    return current
                  }
                }
                ).pending_max_submit_time) / 60) // in minutes
          ,
          size: 'small',
        },
        Cell: ({row}) => {
          if(row.original.pending_max_submit_time && row.original.jobs_pending?.length != 0) {
              const delta_seconds = delta_seconds_to_now(row.original.pending_max_submit_time);
              return "" + Math.ceil(delta_seconds / 60) + " min"
          } else {
            return ''
          }
        }
      },
      {
        accessorKey: "running_latest_wait_time",
        accessorFn: (originalRow) => {
          return originalRow.running_latest_wait_time ? originalRow.running_latest_wait_time / 60 : 0 // in minutes
        },
        header: "Latest job wait",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        muiFilterSliderProps: {
          min: 0,
          max: data.length == 0 ? 0 : Math.ceil(ensure_value(
                data.reduce(
                    (prev, current) => {
                      if(prev.running_latest_wait_time && current.running_latest_wait_time) {
                        return prev.running_latest_wait_time < current.running_latest_wait_time ? current : prev
                      } else if(prev.running_latest_wait_time) {
                        return prev
                      } else {
                        return current
                      }
                    }).running_latest_wait_time) / 60 // in minutes
              )
          ,
          size: 'small',
        },
        Cell: ({row}) => {
          if(row.original.running_latest_wait_time) {
              return "" + Math.ceil(row.original.running_latest_wait_time / 60) + " min"
          } else {
            return ''
          }
        }
      },
      //{ accessorKey: "flags", header: "Flags" },
      //{ accessorKey: "maximum_cpus_per_job", header: "Max CPU/Jobs" },
      //{ accessorKey: "maximum_nodes_per_job", header: "Max Nodes/Jobs" },
      //{ accessorKey: "maximum_memory_per_job", header: "Max Memory/Jobs" },
      //{ accessorKey: "max_time_limit", header: "Max Time Limit" },
      //{ accessorKey: "nodes_online", header: "Nodes Online" },
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
      sorting: [
        {
          id: 'name',
          desc: false
        }
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
        <div className="h-75 bg-white text-muted rounded overflow-auto">
          <Box sx={{ position: 'sticky', top: 0}}>
            <IconButton style={{ float: 'right'}} aria-label="close" onClick={() => {setBackdropToggle(!backdropToggle);}}>
              <CloseIcon />
            </IconButton>
          </Box>
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
