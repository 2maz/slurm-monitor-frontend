import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const endpoint = new SlurmMonitorEndpoint("/gpustatus?node=g001");

interface GPUStatus {
    name: string;
    uuid: string;
    node: string;
    temperature_gpu: number;
    power_draw: number;
    utilization_gpu: number;
    utilization_memory: number;
    memory_total: number;

    // datetime string needs to be formatted
    timestamp: string,
};

interface GPUDataSeries {
    label: string;
    data: GPUStatus[];
}

interface GPUDataSeriesResponse extends Response {
  gpu_status: GPUDataSeries[];
}

const dummy_data : GPUDataSeries[] = [
    {
        label: "Node g001 Tesla A100",
        data: [
            {   name: "Tesla A100", 
                uuid: "abc",
                node: "g001",
                temperature_gpu: 10,
                power_draw: 40,
                utilization_gpu: 75,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 02:39:56.910603"
            },
            {   name: "Tesla A100", 
                uuid: "abc",
                node: "g001",
                temperature_gpu: 90,
                power_draw: 120,
                utilization_gpu: 100,
                utilization_memory: 50,
                memory_total: 10000000,
                timestamp: "2024-07-10 04:39:56.910603"
            }
        ]
    },
    {
        label: "Node n001",
        data: [
            {   name: "Tesla Volta", 
                uuid: "abcd",
                node: "n001",
                temperature_gpu: 10,
                power_draw: 20,
                utilization_gpu: 35,
                utilization_memory: 15,
                memory_total: 100000,
                timestamp: "2024-07-10 01:39:56.910603"
            },
            {   name: "Tesla Volta", 
                uuid: "abcd",
                node: "n001",
                temperature_gpu: 30,
                power_draw: 80,
                utilization_gpu: 30,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 03:39:56.910603"
            }
        ]
    }
];
 
//https://srl-login3.ex3.simula.no:12001/api/v1/monitor/gpustatus?node=g001

const GPUStatusView = () => {
  const [error, setError] = useState<Error>();

  const primaryAxis = useMemo(
    (): AxisOptions<GPUStatus> => ({
      getValue: datum => new Date(Date.parse(datum.timestamp))
    }),
    []
  )

  const secondaryAxes = useMemo(
    (): AxisOptions<GPUStatus>[] => [
      {
        getValue: datum => datum.utilization_gpu,
      },
    ],
    []
  )

  const fetchStatus = async () => {
    const { request, cancel } = endpoint.get();

    return request
      .then(({ data }) => {
        console.log(data);
        return data ? data.gpu_status : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const { data: gpu_data_timeseries_list } = useQuery<GPUDataSeries[]>({
    queryKey: ["gpu_status"],
    queryFn: fetchStatus,
    initialData: [],
    refetchInterval: 1000*60, // refresh every minute
  });

  console.log(gpu_data_timeseries_list);
  //data.map((series_data : GPUDataSeries, index) => series_data);

  return (
    <>
    <div>GPUStatusView: GPU Utilization</div>
    { gpu_data_timeseries_list &&
        gpu_data_timeseries_list.map((series_data : GPUDataSeries) => (
        <div key={series_data.label}>
          <h3>{series_data.label}</h3>
          <LineChart width={800} height={250} data={series_data.data}>
            <Line type="monotone" dataKey="utilization_gpu" stroke="#8884d8"/>
            <XAxis dataKey="timestamp"/>
            <YAxis domain={[0,100]} />
          </LineChart>
        <br/>
        </div>))
    }
    </>
  )
}

export default GPUStatusView;