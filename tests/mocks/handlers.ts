import { http, HttpResponse} from 'msw';

import { MONITOR_BASE_URL } from '../../src/services/slurm-monitor/client';
import { create_node_status_response } from './db';

export const handlers = [
    http.get(MONITOR_BASE_URL + "nodes/:nodename/cpu_status", ({params}) => {
        const nodename = params.nodename as string;
        return HttpResponse.json(create_node_status_response(nodename))
    }),

]