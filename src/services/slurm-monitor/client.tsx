import axios, { CanceledError } from "axios";

export default axios.create({
    baseURL: "http://srl-login3.ex3.simula.no:12000/api/v1/monitor/",
    //header: {}
});

export { CanceledError };