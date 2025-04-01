import { FormEvent, useState } from "react";
import { DotLoader } from "react-spinners";
import { Input, HStack } from "@chakra-ui/react";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Tooltip } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';

import Job from "./Job";
import JobsTable from "./JobsTable";

import useAppState from "../../AppState";
import useCompletedJobs, { Constraints } from "../../hooks/useCompletedJobs";

import { DateTime } from 'luxon';
import CertificateError from "../ErrorReporting";

interface ConstraintsProps {
  constraints: Constraints;
}

const CompletedJobsTableView = ({ constraints } : ConstraintsProps) => {
  const { data: jobs, error, isLoading } = useCompletedJobs(constraints)

  const mlflowSlurmJobs = useAppState((state) => state.slurmRuns);

  if(error)
    return (
      <>
        {error && (
          <>
          <p className="text-danger">No data available: {error.message}</p>
          {<CertificateError />}
          </>
        )}
      </>
    );

  if(isLoading)
    return (<div className="mx-5 flex flex-wrap justify-between">
      <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
    </div>
    )

  if(!jobs)
    return "No Jobs data available"

  const prepared_data = jobs.map((job : Job) => ({
    ...job,
    id: job.job_id,
    end_time: job.end_time ? job.end_time : '',
    submit_time: job.submit_time ? job.submit_time : '',
    start_time: job.start_time ? job.start_time : '',
    mlflow_ref: mlflowSlurmJobs.filter(r => Number(r.SLURM_JOB_ID) == job.job_id)[0]?.mlflow_run_uri,
  }));

  return (
    <JobsTable data={prepared_data} sorting={{id: 'start_time', desc: true}} rowActions={true}/>
  );
};

const CompletedJobsView = () => {
  const [constraints, setConstraints] = useState<Constraints>({ start_after_in_s: DateTime.now().toSeconds() - 2*3600*24})

  const getDateConstraint = (elements: HTMLFormControlsCollection, element_name: string, constraints: Constraints) => {
    const input = elements.namedItem(element_name) as HTMLInputElement
    if(input?.value !== '') {
      return { ...constraints, [element_name]: DateTime.fromFormat(input?.value, "dd.MM.yyyy HH:mm").toSeconds()}
    }
    return constraints
  }

  const handleSubmit = (event : FormEvent) => {
    event.preventDefault();
    const target = event.target as HTMLFormElement

    let query_params = {} as Constraints

    const jobIdInput = target.elements.namedItem("job_id") as HTMLInputElement
    if(jobIdInput?.value !== '' && jobIdInput?.value !== undefined) {
        query_params = { ...query_params, job_id: Number(jobIdInput.value) }
    }

    const userIdInput = target.elements.namedItem("user_id") as HTMLInputElement
    if(userIdInput?.value !== '')
        query_params = { ...query_params, user_id: Number(userIdInput.value) }

    const userNameInput = target.elements.namedItem("user") as HTMLInputElement
    if(userNameInput?.value !== '')
        query_params = { ...query_params, user: userNameInput?.value }

    const minDurationInput = target.elements.namedItem("min_duration") as HTMLInputElement
    if(minDurationInput?.value !== '')
        query_params = { ...query_params, min_duration_in_s: Number(minDurationInput.value) }

    const maxDurationInput = target.elements.namedItem("max_duration") as HTMLInputElement
    if(maxDurationInput?.value !== '')
        query_params = { ...query_params, max_duration_in_s: Number(maxDurationInput.value) }

    query_params = getDateConstraint(target.elements, "start_before_in_s", query_params)
    query_params = getDateConstraint(target.elements, "end_before_in_s", query_params)
    query_params = getDateConstraint(target.elements, "submit_before_in_s", query_params)
    query_params = getDateConstraint(target.elements, "start_after_in_s", query_params)
    query_params = getDateConstraint(target.elements, "end_after_in_s", query_params)
    query_params = getDateConstraint(target.elements, "submit_after_in_s", query_params)

    setConstraints(query_params)
  }

  return (
    <div className="mx-5 my-3 flex flex-wrap justify-between">
      <h2>Jobs (Completed) 
      <Tooltip className="mx-3" title="Search results are completed jobs only and are limited to 1000 by default. Note that all filtering options are optional">
        <HelpIcon/>
      </Tooltip>
      </h2>
      <div>Filter options are referring to the local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} </div>
      <form onSubmit={handleSubmit}>
        <HStack className="my-3">
          <Input 
            type="number"
            name="job_id"
            placeholder="job_id"
          />
          <Input 
            type="number"
            name="user_id"
            placeholder="user id"/>
          <Input name="user" placeholder="username"></Input>
        </HStack>
        <HStack>
          <Tooltip title="minimum job duration in seconds">
            <Input width="15%" defaultValue={300} type="number" name="min_duration" placeholder="min duration in seconds"/>
          </Tooltip>
          <Tooltip title="maximum job duration in seconds">
            <Input width="15%" type="number" name="max_duration" placeholder="max duration in seconds"/>
          </Tooltip>
            <DateTimePicker name="start_before_in_s" label="start before" />
            <DateTimePicker name="start_after_in_s" label="start after" defaultValue={DateTime.local().minus({days: 2})}/>
            <DateTimePicker name="end_before_in_s" label="end before" />
            <DateTimePicker name="end_after_in_s" label="end after" />
            <DateTimePicker name="submit_before_in_s" label="submit before" />
            <DateTimePicker name="submit_after_in_s" label="submit after" />
        </HStack>
        <Input className='my-5 btn btn-secondary' type="submit"/>
      </form>
      <CompletedJobsTableView constraints={constraints} />
      </div>
  )
}

export default CompletedJobsView;
