import MetaData from "../ResponseMetaData";

interface SAcctData {
  AllocTRES: string;
  ElapsedRaw: number;
  SystemCPU: number;
  UserCPU: number;

  AveVMSize: number;
  MaxVMSize: number

  AveCPU: number;
  MinCPU: number;

  AveRSS: number;
  MaxRSS: number;

  AveDiskRead: number;
  AveDiskWrite: number;
}
export interface SlurmJob {
  job_id: number;
  job_step: string;
  job_name: string;
  //job_resources:
  job_state: "COMPLETED" | "PENDING" | "CANCELLED" | "RUNNING";

  array_job_id: number;
  array_task_id?: number | null;

  het_job_id: number;
  het_job_offset: number;
  user_name: string;

  account?: string;

  start_time: string;
 // state_reason: string;
  submit_time: string;
  suspend_time: number;
 //eligible_time: number;
  time_limit: number;
  end_time: string

  exit_code: number;
  partition: string;

  reservation: string;

  nodes: string[];
  priority: number;

  distribution: string;
  gres_detail: string[] | undefined

  // GPUs in use by
  used_gpu_uuids: string[] | undefined

  requested_cpus: number;
  requested_memory_per_node: number;
  requested_node_count: number;

  minimum_cpus_per_node: number;
  timestamp: string

  sacct?: SAcctData

//  accrue_time: number;
//  admin_comment: string;
//  array_max_tasks: number;
//  array_task_string: string;
//  association_id: number;
//  batch_features: string;
//  batch_flag: boolean;
//  batch_host: string;
//  //flags:
//  burst_buffer: string;
//  burst_buffer_state: string;
//  cluster: string;
//  cluster_features: string;
//  command: string;
//  comment: string;
//  contiguous: boolean;
//  cpus: number;
//
//  //core_spec:
//  //thread_spec:
//
//  excluded_nodes: string;
//  features: string;
//  group_id: number;
//
//
//  last_sched_evaluation: number;
//
//  max_cpus: number;
//  max_nodes: number;
//
//  current_working_directory: string;
//  user_name: string;
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
