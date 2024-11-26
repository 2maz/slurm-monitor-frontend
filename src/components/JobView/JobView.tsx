import GPUStatusView from '../GPUStatusView'
import Job from '../JobsView/Job';
import CPUJobStatusView from '../CPUStatusView';
import moment from 'moment';
import { BarLoader } from 'react-spinners';
import useJobStatus from '../../hooks/useJobStatus';

interface Props {
    job_id: number;
    job_data?: Job
    refresh_interval_in_s?: number;
}

const JobView = ({ job_id, job_data, refresh_interval_in_s = 60 } : Props) => {
  const { data : job_status, error, isLoading } = useJobStatus(job_id, refresh_interval_in_s)

  if(isLoading)
    return <>
           <h3>Job Id: {job_id}</h3>
           <BarLoader />
           </>

  if(!job_status)
    return "No JobStatus data available"


  if(job_status.job_state === "PENDING")
    return <>
          <h3>Job Details</h3>
          <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
          </>

  let elements = []
  if(job_status.gres_detail && job_status.gres_detail.length > 0)
  {
      elements = [...elements,
          <div key="gpu-status">
          <h3>GPU Usage</h3>
          {error && <div key={job_id}><h4>Error loading GPU status </h4>Loading ...</div>}
          {!error 
            && <GPUStatusView
                nodename={job_status.batch_host}
                logical_ids={job_status.gres_detail}
                start_time_in_s={typeof(job_status.start_time) === "number" ? job_status.start_time : moment.utc(job_status.start_time).valueOf() / 1000.0}
                end_time_in_s={job_status.job_state == "COMPLETED" ? (typeof(job_status.end_time) === "number" ? job_status.end_time : moment.utc(job_status.end_time).valueOf() / 1000.0) : undefined}
                refresh_interval_in_s={refresh_interval_in_s}
          />}
          </div>
      ]
  } else {
          elements = [...elements, (<div key="gpu-status">
            <h3>GPU Usage</h3>
            <p>No GPUs used</p>
            </div>
          )]
  }

  elements = [...elements, (<div key="cpu-job-status">
          <h3>CPU Usage</h3>
          <CPUJobStatusView job_id={job_id}
                         start_time_in_s={moment.utc(job_status.start_time).unix()}
                         refresh_interval_in_s={refresh_interval_in_s}
          />
          </div>
      )]
  elements = [...elements, (
    <div className="my-3">
      <h3>Job Details</h3>
      <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
    </div>
  )]
  return <div key="{{job_id}}" className="mx-3 my-3"><h2>Job Id: {job_id}</h2>{elements}</div>

}

export default JobView