import ArrowOutwordIcon from "@mui/icons-material/ArrowOutward";
import { Backdrop, Box, Button, IconButton, Link, MenuItem } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import CloseIcon from '@mui/icons-material/Close';

import { useMemo, useState } from "react";
import Job from "./Job";

import useAppState from "../../AppState";
import { MONITOR_API_PREFIX } from "../../services/slurm-monitor/backend.config";
import { useJobsStore } from "../../stores";
import JobView from "../JobView";

interface Props {
  data: Job[];
  sorting?: {id: string, desc: boolean}
  maxHeightInViewportPercent?: number
  rowActions?: boolean
}

const getStringValues = (data: Job[], property_name: keyof Job): string[] => {
  return Array.from([
    ...new Set(data.map((job) => String(job[property_name]))),
  ]).sort();
};

const JobsTable = ({ data, sorting, maxHeightInViewportPercent, rowActions }: Props) => {
  const { columnFilters, setColumnFilters, visibility, setVisibility } = useJobsStore()

  const columns = useMemo<MRT_ColumnDef<Job>[]>(
    () => [
      {
        accessorKey: "job_name",
        header: "Job Name",
        grow: false,
      },
      {
        accessorKey: "job_id",
        header: "Job ID",
        grow: false,

        Cell: ({row}) => {
          return row.original.job_id
        }
      },
      { accessorKey: "user_name", header: "Username", grow: false },
      {
        accessorKey: "partition",
        header: "Partition",
        grow: false,
        filterVariant: "multi-select",
        filterSelectOptions: getStringValues(data, "partition"),
      },
      {
        accessorKey: "nodes",
        header: "Nodes",
        grow: false,
        filterVariant: "multi-select",
        filterSelectOptions: getStringValues(data, "nodes"),
      },
      {
        accessorKey: "job_state",
        header: "Job State",
        grow: false,
        //enableColumnFilterModes: true,
        // https://www.material-react-table.com/docs/guides/column-filtering#pre-built-mrt-filter-functions
        filterVariant: "multi-select",
        filterSelectOptions: ["RUNNING", "CANCELLED", "PENDING", "COMPLETED"],
        Cell: ({ cell }) => {
          const cellValue = cell.getValue<string>();
          if (cellValue === "RUNNING")
            return <p className="text-success">{cellValue}</p>;
          if (cellValue === "CANCELLED")
            return <p className="text-secondary">{cellValue}</p>;
          if (cellValue === "PENDING")
            return <p className="text-warning">{cellValue}</p>;
          if (cellValue === "COMPLETED")
            return <p className="text-muted">{cellValue}</p>;
          return cellValue;
        },
      },
     {
       accessorKey: "start_time",
       accessorFn: (originalRow) => new Date(originalRow.start_time), // convert to date for sorting and filtering
       header: "Start Time",
       filterVariant: "date-range",
       filterFn: "betweenInclusive",
       minSize: 50,
       grow: true,
       Cell: ({ cell }) =>
        `${cell.getValue<Date>().toLocaleDateString()} ${cell
          .getValue<Date>()
          .toLocaleTimeString()}`, // convert for display
     },
     //{
     //  accessorKey: "submit_time",
     //  accessorFn: (originalRow) => DateTime.fromISO(originalRow.start_time).toJSDate(),
     //  header: "Submit Time",
     //  filterVariant: "datetime-range",
     //  minSize: 50,
     //  grow: true,
     //  Cell: ({ cell }) =>
     //   `${cell.getValue<Date>().toLocaleDateString()} ${cell
     //     .getValue<Date>()
     //     .toLocaleTimeString()}`,
     //},
     //{
     //  accessorKey: "end_time",
     //  accessorFn: (originalRow) => DateTime.fromISO(originalRow.start_time).toJSDate(),
     //  header: "End Time",
     //  filterVariant: "datetime-range",
     //  minSize: 50,
     //  grow: true,
     //  Cell: ({ cell }) =>
     //   `${cell.getValue<Date>().toLocaleDateString()} ${cell
     //     .getValue<Date>()
     //     .toLocaleTimeString()}`,
     //},
      //{
      //  accessorKey: "state_reason",
      //  header: "State Reason",
      //  filterVariant: "multi-select",
      //  filterSelectOptions: getStringValues(data, "state_reason"),
      //  Cell: ({ cell }) => {
      //    const cellValue = cell.getValue<string>();
      //    return cellValue != "None" ? cellValue : "";
      //  },
      //},
      {
        accessorKey: "mlflow_ref",
        header: "Mlflow Run",
        Cell: ({ cell }) => {
          const cellValue = cell.getValue<string>();
          if (cellValue)
            return (
              <a href={cellValue} target="_blank">
                <ArrowOutwordIcon />
              </a>
            );
          return "";
        },
      },
    ],
    [data]
  );

  const [backdropToggle, setBackdropToggle] = useState(false);
  const [backdropId, setBackdropId] = useState(-1);
  const { url: backendUrl } = useAppState().currentBackendSpec()

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
    enableRowActions: rowActions,
    renderRowActionMenuItems: ({ row, closeMenu }) => {
      const download_url = backendUrl + MONITOR_API_PREFIX + "jobs/"+ row.original.job_id + "/export"
      return [
      <MenuItem key="download" onClick={() => { closeMenu(); alert("Download for job " + row.original.job_id + " started.\nYour browser will notify once the download has been completed") } }>
        <Link underline='none' download href={download_url}>Download job data</Link>
      </MenuItem>,
    ]},
    enableGrouping: true,
    enableStickyHeader: true,
    //enableStickyFooter: true
    enablePagination: false,
    // row virtualization helps to render only the visual data
    enableRowVirtualization: true,
    initialState: {
      density: "compact",
      showColumnFilters: hasEnabledFilters(),
      sorting: sorting ? [sorting] : []
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
        setBackdropId(row.getValue<number>("job_id"));
      },
      style: {
        cursor: "pointer", //you might want to change the cursor too when adding an onClick
      },
    }),

    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setVisibility,
    state: {
      columnFilters: columnFilters,
      columnVisibility: visibility
    },
    renderTopToolbarCustomActions: (/*{ table }*/) => (
      <div className="d-flex">
        <Button onClick={resetState}>Reset Filters</Button>
      </div>
    ),
  });

  const resetState = () => {
    setColumnFilters([] as MRT_ColumnFiltersState);
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
            .filter((d) => d.job_id === backdropId)
            .map((d) => <JobView job_id={d.job_id} job_data={d}/> )}
        </div>
      </Backdrop>
    </div>
  );
};

export default JobsTable;
