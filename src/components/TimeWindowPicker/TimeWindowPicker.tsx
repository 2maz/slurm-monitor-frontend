import { Button } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import React from 'react'

interface Props {
    startTime: number;
    setStartTime: React.Dispatch<React.SetStateAction<number>>
    endTime: number
    setEndTime: React.Dispatch<React.SetStateAction<number>>
}

const TimeWindowPicker = ({startTime, setStartTime, endTime, setEndTime} : Props) => {
  return (
        <div key="node-datetime-pickers">
        <DateTimePicker
        className="mx-3 my-3"
        label="From"
        value={DateTime.fromSeconds(startTime)}
        timezone="default"
        onChange={(newValue) => {
            if(newValue) {
            setStartTime(newValue.toSeconds())
            }
        }}
        />
        <DateTimePicker
        className="mx-3 my-3"
        label="To"
        value={DateTime.fromSeconds(endTime)}
        timezone="default"
        onChange={(newValue) => {
            if(newValue) {
            setEndTime(newValue.toSeconds())
            }
        }}
        />
        <div className="d-flex">
        <Button onClick={() => {
            setStartTime(DateTime.now().toSeconds() - 3600);
            setEndTime(DateTime.now().toSeconds());
        }}
        >Reset to Last Hour</Button>
        </div>
        </div>
  )
}

export default TimeWindowPicker;