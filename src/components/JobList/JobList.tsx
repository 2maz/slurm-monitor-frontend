import React, { useEffect, useRef, useState } from "react";
import "./JobList.module.css";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import MetaData from "../ResponseMetaData";
import { Backdrop } from "@mui/material";

import  ArrowOutwordIcon from '@mui/icons-material/ArrowOutward'

interface Props {
  baseUrl: string;
}

interface MlflowRun {
  run_uuid: string;
  experiment_id: string;
  run_name: string;
  user_id: string;
  status: string;
  start_time: number;
  artifact_uri: string;
  lifecycle_stage: number;
  run_id: string;
  ref_url: string;
  slurm_job_id: number;
}

interface Job {
  account?: string;
  accrue_time: number;
  admin_comment: string;
  array_job_id: number;
  array_task_id?: number | null;
  array_max_tasks: number;
  array_task_string: string;
  association_id: number;
  batch_features: string;
  batch_flag: boolean;
  batch_host: string;
  //flags:
  burst_buffer: string;
  burst_buffer_state: string;
  cluster: string;
  cluster_features: string;
  command: string;
  comment: string;
  contiguous: boolean;

  //core_spec:
  //thread_spec:

  eligible_time: number;
  end_time: number;
  excluded_nodes: string;
  exit_code: number;
  features: string;
  group_id: number;
  job_id: number;
  //job_resources:
  job_state: "COMPLETED" | "PENDING" | "CANCELLED" | "RUNNING";
  last_sched_evaluation: number;

  max_cpus: number;
  max_nodes: number;
  name: string;
  nodes: string;
  partition: string;
  priority: number;
  qos: string;

  start_time: number;
  submit_time: number;
  suspend_time: number;

  current_working_directory: string;
  user_name: string;
}

interface JobsResponse {
  meta: MetaData;
  errors: string[];
  jobs: Job[];
}

interface MlflowRunsResponse {
  runs: MlflowRun[];
}

const JobList = ({ baseUrl }: Props) => {
  const [error, setError] = useState<Error>();
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());

  const [backdropToggle, setBackdropToggle] = useState(false);
  const [backdropId, setBackdropId] = useState(-1);

  const fetchJobs = () =>
    axios
      .get<JobsResponse>(baseUrl + "jobs")
      .then(({ data }) => {
        setRefreshTime(new Date());
        return data?.jobs;
      })
      .catch((error) => {
        setError(error);
        return [];
      });

  const fetchMlflowRuns = () =>
    axios
      .get<MlflowRunsResponse>('http://srl-login3.ex3.simula.no:12000/api/v1/monitor/slurm-runs/ai-biostrat')
      .then(({ data }) => {
        return data?.runs;
      })
      .catch((error) => {
        setError(error);
        return [];
      });

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    initialData: [],
    refetchInterval: refreshInterval,
  });

  const { data: mlflow_runs } = useQuery({
    queryKey: ["mlflow-runs"],
    queryFn: fetchMlflowRuns,
    initialData: [],
    refetchInterval: refreshInterval,
  });

  if (data?.length == 0)
    return (
      <>
        <h1 className="centered">Jobs</h1>
        {error && (
          <p className="text-danger">No data available: {error.message}</p>
        )}
      </>
    );

  const prepared_data = data.map((job) => ({ ...job, 
    id: job.job_id, 
    mlflow_ref: mlflow_runs.filter(r => r.slurm_job_id == job.job_id)[0]?.ref_url
  }));
  const columns = [
    {
      field: "job_id",
      headerName: "Job ID",
      description: "SLURM job id",
      width: 70,
    },
    {
      field: "name",
      headerName: "Job Name",
      description: "SLURM job name",
      width: 130,
    },
    { field: "user_name", headerName: "Username", width: 130 },
    {
      field: "partition",
      headerName: "Partition",
      width: 130,
      type: "singleSelect",
      valueOptions: [
        ...new Set(prepared_data.map((job) => job.partition)),
      ].sort(),
    },
    {
      field: "nodes",
      headerName: "Nodes",
      width: 130,
      type: "singleSelect",
      valueOptions: [...new Set(prepared_data.map((job) => job.nodes))].sort(),
    },
    {
      field: "job_state",
      headerName: "Job State",
      width: 130,
      type: "singleSelect",
      valueOptions: ["COMPLETED", "PENDING", "CANCELLED", "RUNNING"],
      renderCell: (params) => {
        if (params.value === "RUNNING")
          return <p className="text-success">{params.value}</p>;
        if (params.value === "CANCELLED")
          return <p className="text-secondary">{params.value}</p>;
        if (params.value === "PENDING")
          return <p className="text-warning">{params.value}</p>;
        if (params.value === "COMPLETED")
          return <p className="text-muted">{params.value}</p>;
        return params.value;
        //params.value === "RUNNING" ? <p>{params.value}</p> : <p>new</p>
      },
    },
    {
      field: "start_time",
      headerName: "Start Time",
      width: 230,
      renderCell: (params) => {
        const date = new Date(params.value * 1000);
        return date.toUTCString();
      },
    },
    {
      field: "submit_time",
      headerName: "Submit Time",
      width: 230,
      renderCell: (params) => {
        const date = new Date(params.value * 1000);
        return date.toUTCString();
      },
    },
    {
      field: "state_reason",
      headerName: "State Reason",
      width: 230,
      renderCell: (params) => {
        if (params.value != "None") return params.value;
        return "";
      },
    },
    {
      field: "mlflow_ref",
      headerName: "Mlflow Run",
      width: 150,
      renderCell: (params) => {
        if(params.value)
          return (<a href={params.value}><ArrowOutwordIcon /></a>)
        return "";

      }
    }
  ];

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Jobs</h1>
      <div className="mr-3 d-flex">
        <label className="mx-3">Refresh Interval (in ms):</label>{" "}
        <input
          className="mb-3"
          value={refreshInterval}
          type="number"
          onChange={(e) => {
            setRefreshInterval(e.target.valueAsNumber);
          }}
        />
        <label className="mx-3">
          Last refresh: {refreshTime.toUTCString()}
        </label>
      </div>
      <>
        <DataGrid
          rows={prepared_data}
          columns={columns}
          onCellDoubleClick={(e) => {
            console.log(e);
            setBackdropToggle(true);
            setBackdropId(e.row.id);
          }}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 50 },
            },
          }}
          slots={{
            toolbar: GridToolbar,
          }}
          pageSizeOptions={[10, 50, 100]}
          stickyHeader
          //getRowHeight={() => 30}
        />

        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={backdropToggle}
          onClick={() => {
            setBackdropToggle(!backdropToggle);
          }}
        >
          <div className="h-75 bg-white text-muted rounded overflow-auto">
            {prepared_data
              .filter((d) => d.id === backdropId)
              .map((d) => {
                return (
                  <div className="mx-3 my-3">
                    <pre>{JSON.stringify(d, null, 2)}</pre>
                  </div>
                );
              })}
          </div>
        </Backdrop>
      </>
    </div>
  );
};

export default JobList;
