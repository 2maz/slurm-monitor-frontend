import { FormEvent, useState } from "react";
import { DotLoader } from "react-spinners";
import dayjs from 'dayjs';
import moment from "moment";
import { Input, HStack, Button } from "@chakra-ui/react";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Tooltip } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { convertFieldResponseIntoMuiTextFieldProps } from "@mui/x-date-pickers/internals";

import Job, { JobsResponse } from "./Job";
import JobsTable from "./JobsTable";

import { StateSetters } from "../../services/StateSetters";
import useAppState from "../../AppState";
import useCompletedJobs, { Constraints } from "../../hooks/useCompletedJobs";

import { DateTime } from 'luxon';
import CertificateError from "../ErrorReporting";

interface MlflowRun {
  run_uuid: string;
  experiment_id: string;
  run_name: string;
  user_id: string;
  status: string;
  start_time: number;
  artifact_uri: string;
  lifecycle_stage: number;
  run_id: string;
  ref_url: string;
  slurm_job_id: number;
}

interface MlflowRunsResponse {
  runs: MlflowRun[];
}

interface Props {
  stateSetters: StateSetters;
}

interface ConstraintsProps extends Props {
  constraints: Constraints;
}

const CompletedJobsTableView = ({ stateSetters, constraints } : ConstraintsProps) => {
  const { data: jobs, error, isLoading, dataUpdatedAt } = useCompletedJobs(constraints)

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
    mlflow_ref: mlflowSlurmJobs.filter(r => Number(r.SLURM_JOB_ID) == job.job_id)[0]?.mlflow_run_uri,
    start_time: moment.utc(job.start_time).unix(),
    submit_time: moment.utc(job.submit_time).unix(),
    end_time: moment.utc(job.end_time).unix()
  }));

  return (
    <JobsTable data={prepared_data} stateSetters={stateSetters} sorting={{id: 'start_time', desc: true}}/>
  );
};

const CompletedJobsView = ( { stateSetters } : Props) => {
  const [constraints, setConstraints] = useState({ start_after_in_s: moment().unix() - 2*3600*24})

  const getDateConstraint = (elements: HTMLFormControlsCollection, element_name: string, constraints: Constraints) => {
    const input = elements.namedItem(element_name) as Element
    if(input?.value !== '') {
        return { ...constraints, [element_name]: moment(input?.value, "DD.MM.YYYY hh:mm").unix()}
    }
    return constraints
  }

  const handleSubmit = (event : FormEvent) => {
    event.preventDefault();
    const target = event.target as HTMLFormElement

    let query_params = {} as Constraints

    const jobIdInput = target.elements.namedItem("job_id")
    if(jobIdInput?.value !== '' && jobIdInput?.value !== undefined) {
        query_params = { ...query_params, job_id: jobIdInput?.value }
    }

    const userIdInput = target.elements.namedItem("user_id")
    if(userIdInput?.value !== '')
        query_params = { ...query_params, user_id: userIdInput?.value! }

    const userNameInput = target.elements.namedItem("user")
    if(userNameInput?.value !== '')
        query_params = { ...query_params, user: userNameInput?.value }

    const minDurationInput = target.elements.namedItem("min_duration")
    if(minDurationInput?.value !== '')
        query_params = { ...query_params, min_duration_in_s: minDurationInput?.value }

    const maxDurationInput = target.elements.namedItem("max_duration")
    if(maxDurationInput?.value !== '')
        query_params = { ...query_params, max_duration_in_s: maxDurationInput?.value }

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
      <CompletedJobsTableView constraints={constraints} stateSetters={stateSetters} />
      </div>
  )
}

export default CompletedJobsView;
