import {
  MRT_Cell,
  MRT_ColumnDef,
  MantineReactTable,
  useMantineReactTable,
} from "mantine-react-table";
import { useMemo, useState } from "react";
import Job from "./Job";
import ArrowOutwordIcon from "@mui/icons-material/ArrowOutward";
import { Backdrop } from "@mui/material";

interface Props {
  data: Job[];
}

interface getDateProps {
  cell: MRT_Cell<Job, null>;
}

const getDate = ({ cell }: getDateProps) => {
  const date = new Date(cell.getValue<number>() * 1000);
  return date.toUTCString();
};

const JobTable = ({ data }: Props) => {
  const columns = useMemo<MRT_ColumnDef<Job>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Job Name",
        description: "SLURM job name",
        grow: false,
      },
      {
        accessorKey: "job_id",
        header: "Job ID",
        grow: false,
      },
      { accessorKey: "user_name", header: "Username", width: 130, grow: false, },
      {
        accessorKey: "partition",
        header: "Partition",
        width: 50,
        grow: false,
        //type: "singleSelect",
        //valueOptions: [...new Set(data.map((job) => job.partition))].sort(),
      },
      {
        accessorKey: "nodes",
        header: "Nodes",
        width: 130,
        grow: false,
        //type: "singleSelect",
        //valueOptions: [...new Set(data.map((job) => job.nodes))].sort(),
      },
      {
        accessorKey: "job_state",
        header: "Job State",
        width: 130,
        grow: false,
        //enableColumnFilterModes: true,
        // https://www.mantine-react-table.com/docs/guides/column-filtering#pre-built-mrt-filter-functions
        filterFn: "arrIncludesSome",
        filterVariant: "multi-select",
        mantineFilterMultiSelectProps: {
          data: ["RUNNING", "CANCELLED", "PENDING", "COMPLETED"] as any,
        },
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
        Cell: getDate,
        maxSize: 50,
        grow: true,
      },
      {
        accessorKey: "submit_time",
        header: "Submit Time",
        maxSize: 50,
        grow: true,
        Cell: getDate,
      },
      {
        accessorKey: "state_reason",
        header: "State Reason",
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

  const table = useMantineReactTable({
    columns: columns,
    data: data, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
    layoutMode: "grid-no-grow",
    enableGrouping: true,
    enableStickyHeader: true,
    //enableStickyFooter: true
    mantineTableContainerProps: { style: { maxHeight: 1200 } },
    enablePagination: false,
    // row virtualization helps to render only the visual data
    enableRowVirtualization: true,
    //enable changing filter mode for all columns unless explicitly disabled in a column def
    //enableColumnFilterModes: true,
    initialState: {
      density: "xs",
    },
    // disable when memo feature is used
    enableDensityToggle: true,
    // enableRowActions: true,
    // renderRowActionMenuItems: ({row}) => (
    //   <>
    //   <Menu.Item onClick={() => {
    //   }}>Info</Menu.Item>
    //   </>
    // ),
    mantineTableBodyRowProps: ({ row }) => ({
      onDoubleClick: (event) => {
            setBackdropToggle(true);
            setBackdropId(row.getValue<number>("job_id"));
      },
      style: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      },
    }),
  });

  return (
    <div>
      <MantineReactTable table={table} />

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
    </div>
  );
};

export default JobTable;
