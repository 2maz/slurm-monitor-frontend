interface SlurmData {
  version: { major: string; micro: string; minor: string };
  release: string;
}

interface MetaData {
  plugin: { type: string; name: string };
  Slurm: SlurmData;
}

export default MetaData;