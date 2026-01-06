import { BarLoader } from 'react-spinners';
import useJobReport from '../../hooks/useJobReport';

interface Props {
    job_id: number
    refresh_interval_in_s?: number
}

const JobReportView = ({job_id, refresh_interval_in_s = 3600 } : Props) => {
    const { data: job_report, error, isLoading } = useJobReport(job_id, refresh_interval_in_s)

    if(isLoading) {
        return <div>
            <BarLoader />
        </div>
    }

    if(error) {
        return <div>Sorry, but loading the report for job {job_id} failed - {error.message}</div>

    }

    if(!job_report)
        return "No report for job " + job_id + " available"

    return (
        <div>
            <h4>Report on job {job_id}</h4>
            <ul>
            {job_report.warnings.map((value: string) => <li><text className='text-danger'>WARNING:</text> {value}</li>)}
            </ul>
        </div>
    )
}

export default JobReportView