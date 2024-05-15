import { useEffect, useState } from "react";
import "./App.css";

import { Box, MantineProvider, Paper, createTheme } from "@mantine/core";

import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";
import SettingsIcon from '@mui/icons-material/Settings';

import {
  MRT_ColumnFiltersState,
  MRT_VisibilityState,
} from "material-react-table";
import JobsView from "./components/JobsView";
import PartitionsView from "./components/PartitionsView";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import NodesView from "./components/NodesView";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-react-table/styles.css";
import SettingsView from "./components/SettingsView";

const theme = createTheme({});

/**
 * Retrieve a value from the session storage
 * @param name Name of the key
 * @param defaultValue Default value, in case the value does not exist in the session storage
 * @returns  Current value if it exists, otherwise the default value
 */
const getFromStorage = (name: string, defaultValue: any = []) => {
  const item = window.sessionStorage.getItem(name);
  return item !== null ? JSON.parse(item) : defaultValue;
};

type persistent_value_t = MRT_ColumnFiltersState | MRT_VisibilityState;
type persistent_setter_t =
  | React.Dispatch<React.SetStateAction<MRT_VisibilityState>>
  | React.Dispatch<React.SetStateAction<MRT_ColumnFiltersState>>;

/**
 * Create a persistance decorator for an existing value, setter pair
 * The state is made persistent under the given name.
 * 
 * @param value The state value
 * @param setter  The state setter
 * @param name The name of the value in the session storage
 * @returns The decorated state (to be used similar to useState return value)
 */
const makePersistent = (
  value: persistent_value_t,
  setter: persistent_setter_t,
  name: string
) => {
  return [
    value,
    (updateFn: any) => {
      if(typeof updateFn === 'function') {
        const stateValue = updateFn(value);
        setter(stateValue);
        window.sessionStorage.setItem(name, JSON.stringify(stateValue));
      } else {
        setter(updateFn);
        window.sessionStorage.setItem(name, JSON.stringify(updateFn));

      }
    },
  ];
};


function App() {
  /// State that remembers the currently selected view (one of partitions, nodes, jobs)
  const [view, setView] = useState<string>(
    window.sessionStorage.getItem("view") || "jobs"
  );

  // State for column filters and visible columns for each view
  const [partitionsFilter, setPartitionsFilter] =
    useState<MRT_ColumnFiltersState>(getFromStorage("partitionsFilter", []));
  const [partitionsVisibility, setPartitionsVisibility] =
    useState<MRT_VisibilityState>(getFromStorage("partitionsVisibility", {}));

  const [nodesFilter, setNodesFilter] = useState<MRT_ColumnFiltersState>(
    getFromStorage("nodesFilter", [])
  );
  const [nodesVisibility, setNodesVisibility] = useState<MRT_VisibilityState>(
    getFromStorage("nodesVisibility", {})
  );

  const [jobsFilter, setJobsFilter] = useState<MRT_ColumnFiltersState>(
    getFromStorage("jobsFilter", [])
  );
  const [jobsVisibility, setJobsVisibility] = useState<MRT_VisibilityState>(
    getFromStorage("jobsVisibility", {})
  );

  useEffect(() => {
    document.title = "ex3 - Status: " + view;
  });

  // BEGIN: Ensure that state is stored in sessionStorage, so that is survives a refresh
  const nodesFilterState = makePersistent(
    nodesFilter,
    setNodesFilter,
    "nodesFilter"
  );
  const nodesVisibilityState = makePersistent(
    nodesVisibility,
    setNodesVisibility,
    "nodesVisibility"
  );

  const jobsFilterState = makePersistent(
    jobsFilter,
    setJobsFilter,
    "jobsFilter"
  );
  const jobsVisibilityState = makePersistent(
    jobsVisibility,
    setJobsVisibility,
    "jobsVisibility"
  );

  const partitionsFilterState = makePersistent(
    partitionsFilter,
    setPartitionsFilter,
    "partitionsFilter"
  );
  const partitionsVisibilityState = makePersistent(
    partitionsVisibility,
    setPartitionsVisibility,
    "partitionsVisibility"
  );

  const selectView = (name: string) => {
    setView(name);
    window.sessionStorage.setItem("view", name);
  };

  return (
    <>
      <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="no">
        <MantineProvider theme={theme}>
          <Box>
            <Paper>
              <BottomNavigation showLabels value={view}>
                <BottomNavigationAction
                  label="Partitions"
                  icon={<SegmentIcon />}
                  onClick={() => selectView("partitions")}
                />
                <BottomNavigationAction
                  label="Nodes"
                  icon={<AccountTreeIcon />}
                  onClick={() => selectView("nodes")}
                />
                <BottomNavigationAction
                  label="Jobs"
                  icon={<DirectionsRunsTwoToneIcon />}
                  onClick={() => selectView("jobs")}
                />
                <BottomNavigationAction
                  label="Settings"
                  icon={<SettingsIcon />}
                  onClick={() => selectView("settings")}
                />
              </BottomNavigation>
            </Paper>
            {view && view == "jobs" && (
              <JobsView
                stateSetters={{
                  columnFilters: jobsFilterState,
                  columnVisibility: jobsVisibilityState,
                }}
              />
            )}
            {view && view == "nodes" && (
              <NodesView
                stateSetters={{
                  columnFilters: nodesFilterState,
                  columnVisibility: nodesVisibilityState,
                }}
              />
            )}
            {view && view == "partitions" && (
              <PartitionsView
                stateSetters={{
                  columnFilters: partitionsFilterState,
                  columnVisibility: partitionsVisibilityState,
                }}
              />
            )}
            {view && view == "settings" && (
              <SettingsView />
            )}
          </Box>
        </MantineProvider>
      </LocalizationProvider>
    </>
  );
}

export default App;
