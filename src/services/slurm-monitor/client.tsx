import axios, { CanceledError } from "axios";

export const MONITOR_BASE_URL = "https://srl-login3.ex3.simula.no:12000/api/v1/monitor/";

export default axios.create({
    baseURL: MONITOR_BASE_URL
    //header: {}
});

export { CanceledError };