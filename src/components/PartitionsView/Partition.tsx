import Job from "../JobsView/Job";

interface Partition {
  flags: string[];
  preemption_mode: string[];
  allowed_allocation_nodes: string;
  allowed_accounts: string;
  allowed_groups: string;
  allowed_qos: string;
  alternative: string;
  billing_weights: string;
  default_memory_per_cpu: number;
  default_time_limit: number;
  denied_accounts: string;
  denied_qos: string;
  preemption_grace_time: number;
  maximum_cpus_per_node: number;
  maximum_memory_per_node: number;
  maximum_nodes_per_job: number;
  max_time_limit: number;
  min_nodes_per_job: number;
  over_time_limit: string;
  priority_job_factor: number;
  priority_tier: number;
  qos: string;
  nodes_online: number;

  name: string;
  nodes: string;
  nodes_compact: string;

  total_cpus: number;
  total_nodes: number;
  tres: string;

  jobs_pending?: Job[]
  jobs_running?: Job[]
  pending_max_submit_time?: number | undefined
  running_latest_wait_time?: number | undefined
}

export default Partition;
