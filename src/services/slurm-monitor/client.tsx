import axios, { CanceledError } from "axios";

export default axios.create({
    baseURL: "http://srl-login3.ex3.simula.no:12000/api/v1/monitor/",
    //header: {}
});

export { CanceledError };

// class AxiosClient<T> {
//     baseUrl: string

//     constructor(url: string) {
//         this.baseUrl = url
//     }

//     get<T>(prefix: string) {
//         return () =>
//             axios
//             .get<Response<T>>(this.baseUrl + "/" + prefix)
//             .then(({ data }) => {
//                 setRefreshTime(new Date());
//                 return data?.jobs;
//             })
//             .catch((error) => {
//                 setError(error);
//                 return [];
//             });

//             }



// }

// const createClient = (baseUrl) => {
//     return new AxiosClient<T>(baseUrl)
// }

// //export default AxiosClient;