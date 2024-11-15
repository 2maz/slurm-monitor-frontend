import {
  MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useState } from "react";
import Job from "./Job";
import ArrowOutwordIcon from "@mui/icons-material/ArrowOutward";
import { Backdrop, Button } from "@mui/material";

import { StateSetters } from "../../services/StateSetters";
import JobView from "../JobView";

interface Props {
  data: Job[];
  stateSetters: StateSetters
}

const getStringValues = (data: Job[], property_name: keyof Job): string[] => {
  return Array.from([
    ...new Set(data.map((job) => String(job[property_name]))),
  ]).sort();
};

const JobsTable = ({ data, stateSetters }: Props) => {
  const columns = useMemo<MRT_ColumnDef<Job>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Job Name",
        grow: false,
      },
      {
        accessorKey: "job_id",
        header: "Job ID",
        grow: false,
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
        // https://www.mantine-react-table.com/docs/guides/column-filtering#pre-built-mrt-filter-functions
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
        header: "Start Time",
        accessorFn: (row) => new Date(row.start_time * 1000),
        filterVariant: "datetime-range",
        Cell: ({ cell }) =>
          `${cell.getValue<Date>().toLocaleDateString()} ${cell
            .getValue<Date>()
            .toLocaleTimeString()}`,
        minSize: 50,
        grow: true,
      },
      {
        accessorKey: "submit_time",
        header: "Submit Time",
        accessorFn: (row) => new Date(row.submit_time * 1000),
        filterVariant: "datetime-range",
        Cell: ({ cell }) =>
          `${cell.getValue<Date>().toLocaleDateString()} ${cell
            .getValue<Date>()
            .toLocaleTimeString()}`,
        minSize: 50,
        grow: true,
      },
      {
        accessorKey: "end_time",
        header: "End Time",
        accessorFn: (row) => new Date(row.end_time * 1000),
        filterVariant: "datetime-range",
        Cell: ({ cell }) =>
          `${cell.getValue<Date>().toLocaleDateString()} ${cell
            .getValue<Date>()
            .toLocaleTimeString()}`,
        minSize: 50,
        grow: true,
      },
      {
        accessorKey: "state_reason",
        header: "State Reason",
        filterVariant: "multi-select",
        filterSelectOptions: getStringValues(data, "state_reason"),
        Cell: ({ cell }) => {
          const cellValue = cell.getValue<string>();
          return cellValue != "None" ? cellValue : "";
        },
      },
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

  const [columnFilters, setColumnFilters] = stateSetters.columnFilters;
  const [columnVisibility, setColumnVisibility] = stateSetters.columnVisibility;

  const hasEnabledFilters = () => {
    return (
      stateSetters.columnFilters[0].filter(
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
    },
    // disable when memo feature is used
    enableDensityToggle: true,
    muiTableBodyRowProps: ({ row }) => ({
      onDoubleClick: (event) => {
        setBackdropToggle(true);
        setBackdropId(row.getValue<number>("job_id"));
      },
      style: {
        cursor: "pointer", //you might want to change the cursor too when adding an onClick
      },
    }),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnFilters: columnFilters,
      columnVisibility: columnVisibility
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
            .filter((d) => d.job_id === backdropId)
            .map((d) => <JobView job_id={d.job_id} job_data={d}/> )}
        </div>
      </Backdrop>
    </div>
  );
};

export default JobsTable;
