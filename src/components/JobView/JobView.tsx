import GPUStatusView from '../GPUStatusView'
import Job from '../JobsView/Job';
import CPUJobStatusView from '../CPUStatusView';
import { BarLoader } from 'react-spinners';
import useJobStatus from '../../hooks/useJobStatus';
import { DateTime } from 'luxon';
import { JSX } from 'react';
import JobReportView from '../JobReportView';

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

  let elements : JSX.Element[] = []
  if((job_status.used_gpu_uuids && job_status.used_gpu_uuids.length) || (job_status.sacct && job_status.sacct.AllocTRES.includes("gpu")))
  {
      elements = [...elements,
          <div key={"gpu-status"+job_id}>
          <h3>GPU Usage:</h3>
          {error && <div key={"gpu-status-"+job_id}><h4>Error loading GPU status </h4>Loading ...</div>}
          {!error 
            && job_status.nodes.map((node) => 
              <GPUStatusView
                  nodename={node}
                  uuids={job_status.used_gpu_uuids}
                  start_time_in_s={typeof(job_status.start_time) === "number" ? job_status.start_time : DateTime.fromISO(job_status.start_time as unknown as string, {zone: 'utc'}).toSeconds()}
                  end_time_in_s={job_status.job_state == "COMPLETED" ? (typeof(job_status.end_time) === "number" ? job_status.end_time : DateTime.fromISO(job_status.end_time as unknown as string, { zone: 'utc'}).toSeconds()) : undefined}
                  refresh_interval_in_s={refresh_interval_in_s}
              />
            )
          }
          </div>
      ]
  } else {
          elements = [...elements, (<div key={"gpu-status"+job_id}>
            <h3>GPU Usage</h3>
            <p>No GPUs used</p>
            </div>
          )]
  }

  elements = [...elements, (<div key={"cpu-status-"+job_id}>
          <h3>CPU Usage</h3>
          <CPUJobStatusView job_id={job_id}
                         start_time_in_s={Math.floor(DateTime.fromISO(job_status.start_time as unknown as string, {zone: 'utc'}).toSeconds())}
                         end_time_in_s={job_status.job_state == "COMPLETED" ? (typeof(job_status.end_time) === "number" ? job_status.end_time : Math.ceil(DateTime.fromISO(job_status.end_time as unknown as string, {zone: 'utc'}).toSeconds())) : undefined}
                         refresh_interval_in_s={refresh_interval_in_s}
          />
          </div>
      )]

  elements = [...elements,(<div key={"job-report-" + job_id}>
    <h3>Job Report</h3>
    <JobReportView job_id={job_id} refresh_interval_in_s={refresh_interval_in_s}/>
    </div>
  )]

  elements = [...elements, (
    <div className="my-3">
      <h3>Job Details</h3>
      <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
    </div>
  )]
  return <div key={"job-view"+ job_id} className="mx-3 my-3"><h2>Job Id: {job_id}</h2>{elements}</div>

}

export default JobView