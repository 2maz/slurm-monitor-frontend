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
  name: string;
  nodes: string;
  over_time_limit: string;
  priority_job_factor: number;
  priority_tier: number;
  qos: string;
  nodes_online: number;
  total_cpus: number;
  total_nodes: number;
  tres: string;
}

export default Partition;
