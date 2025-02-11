import useJobs from "./useJobs"
import usePartitions from "./usePartitions"

const usePartitionsQueue = () => {
    const { data, isLoading, error } = useJobs(10)
    const { data: partitions, isLoading: p_isLoading, error: p_error } = usePartitions()
 
    let updated_partitions = undefined
    if(data && partitions) {
        updated_partitions = partitions.map((partition) => {
            const pending_jobs = data.filter((job) => job.partition == partition.name && job.job_state == 'PENDING');
            const running_jobs = data.filter((job) => job.partition == partition.name && job.job_state == 'RUNNING');
            let running_latest_wait_time = undefined
            if(running_jobs.length > 0) {
                const latest_job = running_jobs.reduce((prev, cur) => { return prev.start_time < cur.start_time ? cur : prev })
                running_latest_wait_time = latest_job.start_time - latest_job.submit_time
            }

            return {
                ...partition,
                pending_jobs: pending_jobs,
                running_jobs: running_jobs, 
                pending_max_submit_time: pending_jobs.length > 0 ? pending_jobs.reduce((prev, cur) => { return prev.submit_time > cur.submit_time ? cur : prev }).submit_time : undefined,
                running_latest_wait_time: running_latest_wait_time 
            }
        })
    } else if(partitions) {
        updated_partitions = partitions.map((partition) => (
            {
                ...partition,
                pending_jobs: [],
                running_jobs: [],
                max_submit_time: undefined
            })
        )

    }
    return { partitions: updated_partitions, isLoading: isLoading && p_isLoading, error: { jobs: error, partitions: p_error} }
}

export default usePartitionsQueue