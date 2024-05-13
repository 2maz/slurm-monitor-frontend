interface Node {
  architecture: string;
  burstbuffer_network_address: string;
  boards: number;
  boot_time: number;
  comment: string;
  cores: number;
  cpu_binding: number;
  cpu_load: number;
  extra: string;
  free_memory: number;
  cpus: number;
  last_busy: number;
  features: string;
  active_features: string;
  gres: string;
  gres_drained: string;
  gres_used: string;
  mcs_label: string;
  name: string;
  next_state_after_reboot: string;
  next_state_after_reboot_flags: string[];
  address: string;
  hostname: string;
  state: string;
  state_flags: string[];
  operating_system: string;
  owner: string;
  partitions: string[];
  port: number;
  real_memory: boolean;
  reason: string;
  reason_changed_at: number;
  reason_set_by_user: boolean;
  slurmd_start_time: number;
  sockets: number;
  threads: number;
  temporary_disk: boolean;
  weight: number;
  tres: string;
  tres_used: string | null;
  tres_weighted: number;
  slurmd_version: string;
  alloc_memory: number;
  alloc_cpus: number;
  idle_cpus: number;
}

export const availableGPUs = (node: {gres: string}) => {
  const resourcesFields = node.gres.split(':')
  const index = resourcesFields.length - 1
  return Number(resourcesFields[index]);
}

export const freeResources = (node: {gres: string, gres_used: string}) => {
  if(!node.gres)
    return 0;

  const resourcesFields = node.gres.split(':')
  const index = resourcesFields.length - 1
  const availableResources = Number(resourcesFields[index]);

  const usedResources = Number(node.gres_used.split(':')[index].split('(')[0]);
  return availableResources - usedResources;
}

export default Node;