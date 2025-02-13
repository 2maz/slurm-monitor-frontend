/* eslint-disable @typescript-eslint/unbound-method */
//import { factory, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker'

//    {
//      "architecture": "x86_64",
//      "burstbuffer_network_address": "",
//      "boards": 1,
//      "boot_time": 1718800493,
//      "comment": "",
//      "cores": 1,
//      "cpu_binding": 0,
//      "cpu_load": 1981,
//      "extra": "",
//      "free_memory": 749507,
//      "cpus": 96,
//      "last_busy": 1729506166,
//      "features": "location=local",
//      "active_features": "location=local",
//      "gres": "gpu:tesla:16",
//      "gres_drained": "N/A",
//      "gres_used": "gpu:tesla:7(IDX:0-4,8,11)",
//      "mcs_label": "",
//      "name": "g001",
//      "next_state_after_reboot": "invalid",
//      "address": "g001",
//      "hostname": "g001",
//      "state": "mixed",
//      "state_flags": [],
//      "next_state_after_reboot_flags": [],
//      "operating_system": "Linux 5.15.0-1058-nvidia #59-Ubuntu SMP Tue Jun 4 01:39:40 UTC 2024",
//      "owner": null,
//      "partitions": [
//        "dgx2q"
//      ],
//      "port": 6818,
//      "real_memory": 1,
//      "reason": "",
//      "reason_changed_at": 0,
//      "reason_set_by_user": null,
//      "slurmd_start_time": 1729506158,
//      "sockets": 96,
//      "threads": 1,
//      "temporary_disk": 0,
//      "weight": 1,
//      "tres": "cpu=96,mem=1M,billing=96,gres/gpu=16",
//      "slurmd_version": "21.08.8-2",
//      "alloc_memory": 0,
//      "alloc_cpus": 41,
//      "idle_cpus": 55,
//      "tres_used": "cpu=41,gres/gpu=7",
//      "tres_weighted": 41
//    },
//
// {
//     "cpu_status": [
//       {
//         "label": "n001-cpu",
//         "data": [
//           {
//             "node": "n001",
//             "local_id": 127,
//             "cpu_percent": 0.5,
//             "timestamp": "2024-10-29T09:40:08.090925"
//           },
//           {

const create_cpu_status_timeseries = (nodename: string, start_time: Date, resolution_in_s: number, number_of_samples: number) => {
    Array.from(Array(number_of_samples), (_item, index) => {
        return {
            node: nodename,
            local_id: faker.number.int({min: 0, max: 128}),
            cpu_percent: faker.number.int({min: 0, max: 100}),
            timestamp: new Date(start_time.getUTCSeconds() + index*resolution_in_s *1000)
        }
    })
}

export const create_node_status_response = (nodename: string) => { 
            return { 
                cpu_status: 
                [{
                    label: nodename + "-cpu",
                    data: create_cpu_status_timeseries(nodename,
                        new Date(),
                        5,
                        120
                    )
                }
                ]
            }
}
