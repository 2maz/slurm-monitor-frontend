import MetaData from "../ResponseMetaData";

export interface SlurmJob {
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
  cpus: number;

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

  start_time: number;
  state_reason: string;
  submit_time: number;
  suspend_time: number;

  current_working_directory: string;
  user_name: string;
}

// Provide id as an alias for the job_id
interface Job extends SlurmJob {
  id: SlurmJob['job_id']
}

export interface JobsResponse {
  meta: MetaData;
  errors: string[];
  jobs: Job[];
}

export default Job;
