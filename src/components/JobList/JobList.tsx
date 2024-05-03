import React, { useEffect, useRef, useState } from "react";
import "./JobList.module.css";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DataTable from "react-data-table-component";

interface Props {
  baseUrl: string;
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
  job_state: string;
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
  jobs: Job[];
}

const JobList = ({ baseUrl }: Props) => {
  const [filterUser, setFilterUser] = useState("");
  const searchInput = useRef(null);
  const [resetPaginationToggle, setResetPaginationToggle] =
    React.useState(false);

   useEffect(() => {
    if(searchInput.current)
        searchInput.current.focus();
   },[filterUser]);

  const fetchJobs = () =>
    axios.get<JobsResponse>(baseUrl + "jobs").then(({ data }) => data?.jobs);

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    initialData: [],
  });

  const FilterComponent = ({ filterText, onFilter, onClear }) => (
    <>
      <input
        ref={searchInput}
        id="search"
        type="text"
        placeholder="Filter By Username"
        aria-label="Search Input"
        value={filterText}
        onChange={onFilter}
      />
      <button className="btn" type="button" onClick={onClear}>
        x
      </button>
    </>
  );

  const subHeaderComponentMemo = React.useMemo(() => {
    const handleClear = () => {
      if (filterUser) {
        setResetPaginationToggle(!resetPaginationToggle);
        setFilterUser("");
      }
    };
    return (
      <FilterComponent
        onFilter={(e) => {
          setFilterUser(e.target.value);
        }}
        onClear={handleClear}
        filterText={filterUser}
      />
    );
  }, [filterUser, resetPaginationToggle]);

  const filtered_data = data.filter(
    (item) =>
      item.user_name &&
      item.user_name.toLowerCase().includes(filterUser.toLowerCase())
  );

  const conditionalRowStyles = [
    {
      when: (row: Job) => row.job_state === "CANCELLED",
      style: (row: Job) => ({ backgroundColor: "lightgray" }),
    },
    {
      when: (row: Job) => row.job_state === "RUNNING",
      style: (row: Job) => ({ backgroundColor: "lightyellow" }),
    },
    {
      when: (row: Job) => row.job_state === "COMPLETED",
      style: (row: Job) => ({ backgroundColor: "green" }),
    },
    {
      when: (row: Job) => row.job_state === "PENDING",
      //style: (row: Job) => ({ backgroundColor: 'orange' }),
    },
  ];

  const columns = [
    {
      name: "Job ID",
      selector: (row: Job) => row.job_id,
      sortable: true,
    },
    {
      name: "Name",
      selector: (row: Job) => row.name,
      sortable: true,
    },
    {
      name: "Username",
      selector: (row: Job) => row.user_name,
      sortable: true,
    },
    {
      name: "Partition",
      selector: (row: Job) => row.partition,
      sortable: true,
    },
    {
      name: "Nodes",
      selector: (row: Job) => row.nodes,
      sortable: true,
    },
    {
      name: "Job Status",
      selector: (row: Job) => row.job_state,
      sortable: true,
    },
  ];

  return (
    <div className="flex flex-wrap justify-between">
      <h1>Jobs</h1>
      <DataTable
        fixedHeader={true}
        pagination
        columns={columns}
        data={filtered_data}
        conditionalRowStyles={conditionalRowStyles}
        subHeader
        subHeaderComponent={subHeaderComponentMemo}
      ></DataTable>
      {/* <table className="table table-hover table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th className="p-2" onClick={()=>{applySorting('job_id')}}>Id {sorting.key === 'job_id' && (sorting.ascending ? '▲' : '▼')} </th>
            <th className="p-2">Name</th>
          </tr>
        </thead>
        <tbody className="table-group-divider">
          {data?.map((job: Job) => (
            <tr key={job.job_id}>
              <td>{job.job_id}</td>
              <td>{job.name}</td>
            </tr>
          ))}
        </tbody>
      </table> */}
    </div>
  );
};

export default JobList;
