import {
  MRT_Cell,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import Job from "./Job";
import ArrowOutwordIcon from "@mui/icons-material/ArrowOutward";
import { Backdrop, Button } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";

interface Props {
  data: Job[];
  columnFilters: any;
  setColumnFilters: any;
}

interface getDateProps {
  cell: MRT_Cell<Job, null>;
}

const getDate = ({ cell }: getDateProps) => {
  const date = new Date(cell.getValue<number>() * 1000);
  return date.toUTCString();
};

const getValues = (data: Job[], property_name: keyof Job) => {
  return Array.from([...new Set(data.map((job) => job[property_name]))]).sort();
};

const JobTable = ({ data, columnFilters, setColumnFilters }: Props) => {
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
        filterSelectOptions: getValues(data, "partition"),
      },
      {
        accessorKey: "nodes",
        header: "Nodes",
        grow: false,
        filterVariant: "multi-select",
        filterSelectOptions: getValues(data, "nodes"),
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
        accessorKey: "state_reason",
        header: "State Reason",
        filterVariant: "multi-select",
        filterSelectOptions: getValues(data, "state_reason"),
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
              <a href={cellValue}>
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

  const hasEnabledFilters = () => {
    return columnFilters.filter((filter: { 'id': string, 'value': any} ) => !filter.id.endsWith("time")).length > 0
  }

  const table = useMaterialReactTable({
    columns: columns,
    data: data, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
    //layoutMode: "grid-no-grow",
    //enableColumnResizing: true,
    enableGrouping: true,
    enableStickyHeader: true,
    //enableStickyFooter: true
    //mantineTableContainerProps: { style: { maxHeight: 1200 } },
    enablePagination: false,
    // row virtualization helps to render only the visual data
    enableRowVirtualization: true,
    //enable changing filter mode for all columns unless explicitly disabled in a column def
    //enableColumnFilterModes: true,
    initialState: {
      density: "compact",
      showColumnFilters: hasEnabledFilters(),
    },
    // disable when memo feature is used
    enableDensityToggle: true,
    // row pinning does not work properly
    // enableRowPinning: true,
    // rowPinningDisplayMode: 'select-top',
    //enableRowActions: true,
    // renderRowActionMenuItems: ({ row }) => (
    //   <>
    //     <Menu.Item onClick={() => { console.log("PIN", row.id); row.pin('top') }}>Info</Menu.Item>
    //   </>
    // ),
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
      <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="no">
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
              .map((d) => {
                return (
                  <div key={d.job_id} className="mx-3 my-3">
                    <pre>{JSON.stringify(d, null, 2)}</pre>
                  </div>
                );
              })}
          </div>
        </Backdrop>
      </LocalizationProvider>
    </div>
  );
};

export default JobTable;
