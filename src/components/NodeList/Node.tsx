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

const availableGPUs = (node: {gres: string}) => {
  const resourcesFields = node.gres.split(':')
  const index = resourcesFields.length - 1
  return Number(resourcesFields[index]);
}

const freeResources = (node: {gres: string, gres_used: string}) => {
  if(!node.gres)
    return 0;

  const resourcesFields = node.gres.split(':')
  const index = resourcesFields.length - 1
  const availableResources = Number(resourcesFields[index]);

  const usedResources = Number(node.gres_used.split(':')[index].split('(')[0]);
  return availableResources - usedResources;
}

export const getColumns = (data: Node[]) => {
    return [
    {
      field: "name",
      headerName: "Name",
      description: "Node Name",
      width: 120,
    },
    {
      field: "architecture",
      headerName: "Architecture",
      width: 130,
      type: "singleSelect",
      valueOptions: [
        ...new Set(data.map((node: Node) => node.architecture)),
      ].sort(),
    },
    {
      field: "operating_system",
      headerName: "Operating System",
      width: 130,
      type: "singleSelect",
      valueOptions: [
        ...new Set(data.map((node: Node) => node.operating_system)),
      ].sort(),
    },
    { field: "cores", headerName: "Cores", width: 130 },
    {
      field: "free_memory",
      headerName: "Free Memory",
      width: 130,
    },
    { field: "cpus", headerName: "CPUs", width: 130 },
    { field: "gres", headerName: "Resources", width: 130 },
    { 
      field: "gres_used", headerName: "Used Resources", width: 250,
      renderCell: (params) => {
        const free = freeResources(params.row);
        const textColor = free > 0 ? "text-success" : "text-danger";
        return (availableGPUs(params.row) <= 0) ? '' : <p className={textColor}>{params.value} (unused: {free})</p>
      }
    },
    { field: "partitions", headerName: "Partitions", width: 200 },
    { field: "burstbuffer_network_address", headerName: "BurstBuffer Network Address" },
    { field: "boards", headerName: "Boards" },
    { field: "boot_time", headerName: "Boot Time" },
    { field: "comment", headerName: "Comment" },
    { field: "cpu_binding", headerName: "CPU Binding" },
    { field: "cpu_load", headerName: "CPU Load" },
    //{ field: "extra", header: "Extra",
    //{ field: "last_busy: number;
    //{ field: "features: string;
    //{ field: "active_features: string;
    //{ field: "gres_drained: string;
    //{ field: "mcs_label: string;
    //{ field: "name: string;
    //{ field: "next_state_after_reboot: string;
    //{ field: "next_state_after_reboot_flags: string[];
    //{ field: "address: string;
    //{ field: "hostname", headerName: "Hostname" },
    { field: "state", headerName: "State" },
    //{ field: "state_flags: string[];
    //{ field: "operating_system: string;
    //{ field: "owner: string;
    //{ field: "port: number;
    //{ field: "real_memory: boolean;
    //{ field: "reason: string;
    //{ field: "reason_changed_at: number;
    //{ field: "reason_set_by_user: boolean;
    //{ field: "slurmd_start_time: number;
    //{ field: "sockets: number;
    { field: "threads", headerName: "Threads" },
    //{ field: "temporary_disk: boolean;
    //{ field: "weight: number;
    //{ field: "tres: string;
    //{ field: "tres_used: string | null;
    //{ field: "tres_weighted: number;
    //{ field: "slurmd_version: string;
    { field: "alloc_memory", headerName: "Allocated Memory" },
    { field: "alloc_cpus", headerName: "Allocated CPUs" },
    { field: "idle_cpus", headerName: "Idle CPUs" },
  ];
}

export const columnsVisibilityDefault = {
    partitions: true,
    burstbuffer_network_address: false,
    boards: false,
    boot_time: false,
    comment: false,
    cores: false,
    cpu_binding: false,
    cpu_load: false,
}

export default Node;