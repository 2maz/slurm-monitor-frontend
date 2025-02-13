import { Dispatch, SetStateAction, useEffect, useState } from "react";
import "./App.css";

import { Box, MantineProvider, Paper, createTheme } from "@mantine/core";

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";
import SettingsIcon from "@mui/icons-material/Settings";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import AppsIcon from '@mui/icons-material/Apps';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InventoryIcon from '@mui/icons-material/Inventory';
import AvTimerIcon from '@mui/icons-material/AvTimer';

import {
  MRT_ColumnFiltersState,
  MRT_VisibilityState,
} from "material-react-table";
import JobsView, { CompletedJobsView } from "./components/JobsView";
import PartitionsView from "./components/PartitionsView";
import GPUStatusView from "./components/GPUStatusView";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import NodesView from "./components/NodesView";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-react-table/styles.css";
import SettingsView from "./components/SettingsView";
import useAppState from "./AppState";
import MLFlowSlurmMapper, {
  MLFlowSlurmRunInfo,
} from "./services/slurm-monitor/mlflow";

import useNodesInfo from "./hooks/useNodesInfos";
import QueryView from "./components/QueryView";
import BenchmarksView from "./components/BenchmarksView";

import GithubLogo from "./assets/github-mark.png"

const theme = createTheme({});

/**
 * Retrieve a value from the session storage
 * @param name Name of the key
 * @param defaultValue Default value, in case the value does not exist in the session storage
 * @returns  Current value if it exists, otherwise the default value
 */
const getFromStorage = <T,>(name: string, defaultValue: unknown = []) => {
  const item = window.sessionStorage.getItem(name);
  return (item !== null ? JSON.parse(item) : defaultValue) as T;
};

type Serializable = MRT_ColumnFiltersState | MRT_VisibilityState

/**
 * Create a persistance decorator for an existing value, setter pair
 * The state is made persistent under the given name.
 *
 * @param value The state value
 * @param setter  The state setter
 * @param name The name of the value in the session storage
 * @returns The decorated state (to be used similar to useState return value)
 */
const makePersistent = <T extends Serializable>(
  value: T,
  setter: Dispatch<SetStateAction<T>>,
  name: string
) : [T, Dispatch<SetStateAction<T>>] => {
    const stateSetter : Dispatch<SetStateAction<T>> = (updateFn) => {
      if (typeof updateFn === "function") {
        const stateValue = updateFn(value)
        setter(stateValue);
        window.sessionStorage.setItem(name, JSON.stringify(stateValue));
      } else {
        setter(updateFn);
        window.sessionStorage.setItem(name, JSON.stringify(updateFn));
      }
  }
  return [value, stateSetter]
}

function App() {
  /// State that remembers the currently selected view (one of partitions, nodes, jobs)
  const [view, setView] = useState<string>(
    window.sessionStorage.getItem("view") || "jobs"
  );
  const { data: nodes_info } = useNodesInfo();

  // State for column filters and visible columns for each view
  const [partitionsFilter, setPartitionsFilter] =
    useState<MRT_ColumnFiltersState>(getFromStorage("partitionsFilter", []));
  const [partitionsVisibility, setPartitionsVisibility] =
    useState<MRT_VisibilityState>(getFromStorage("partitionsVisibility", {}));

  const [nodesFilter, setNodesFilter] = useState<MRT_ColumnFiltersState>(
    getFromStorage("nodesFilter", [])
  );
  const [nodesVisibility, setNodesVisibility] = useState<MRT_VisibilityState>(
    getFromStorage("nodesVisibility", {
      alloc_cpus: false,
      cores: false,
      alloc_memory: false, // only getting zeros here
    })
  );

  const [jobsFilter, setJobsFilter] = useState<MRT_ColumnFiltersState>(
    getFromStorage("jobsFilter", [])
  );
  const [jobsVisibility, setJobsVisibility] = useState<MRT_VisibilityState>(
    getFromStorage<MRT_VisibilityState>("jobsVisibility", {})
  );

  const [completedJobsFilter, setCompletedJobsFilter] = useState<MRT_ColumnFiltersState>(
    getFromStorage("completedJobsFilter", [])
  );
  const [completedJobsVisibility, setCompletedJobsVisibility] = useState<MRT_VisibilityState>(
    getFromStorage("completedJobsVisibility", {})
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const mlflowUrls = useAppState((state) => state.mlflowUrls);
  const slurmJobs = useAppState((state) => state.slurmRuns);
  const setSlurmJobs = useAppState((state) => state.updateSlurmRuns);

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

  const completedJobsFilterState = makePersistent(
    completedJobsFilter,
    setCompletedJobsFilter,
    "completedJobsFilter"
  );
  const completedJobsVisibilityState = makePersistent(
    completedJobsVisibility,
    setCompletedJobsVisibility,
    "completedJobsVisibility"
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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const currentTime = new Date().toString();

  return (
    <>
      {mlflowUrls.map((url) => (
        <MLFlowSlurmMapper
          key={"slurm-mapper-" + url}
          url={url}
          updateFn={(runs: MLFlowSlurmRunInfo[]) => {
            const newSlurmJobs: MLFlowSlurmRunInfo[] = slurmJobs
              .filter(
                (info: MLFlowSlurmRunInfo) =>
                  !info.mlflow_run_uri?.startsWith(url)
              )
              .concat(runs);
            setSlurmJobs(newSlurmJobs);
          }}
        />
      ))}

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
                  label="GPUStatus"
                  icon={<MonitorHeartIcon />}
                  onClick={() => selectView("gpu_status")}
                />
                <BottomNavigationAction
                  label=""
                  id="extras-button"
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  icon={<AppsIcon />}
                  onClick={handleClick}
                />
              </BottomNavigation>
              <Menu
                 id="extras-menu"
                 open={open}
                 anchorEl={anchorEl}
                 onClose={handleClose}
                 MenuListProps={{
                  'aria-labelledby': 'menu-button'
                 }}
              >
                <MenuItem onClick={() => {
                  selectView("inspect-completed-jobs")
                  handleClose()
                }}>
                  <InventoryIcon /><div className="mx-2">Inspect Completed Jobs</div>
                </MenuItem>
                <MenuItem onClick={() => {
                  selectView("query")
                  handleClose()
                }}>
                  <QueryStatsIcon /><div className="mx-2">Usage Stats</div>
                </MenuItem>
                <MenuItem onClick={() => {
                    selectView("benchmarks")
                    handleClose()
                }}>
                 <AvTimerIcon /><div className="mx-2">Benchmarks</div>
                </MenuItem>
                <MenuItem onClick={() => {
                    selectView("settings")
                    handleClose()
                }}>
                 <SettingsIcon /><div className="mx-2">Settings</div>
                </MenuItem>
                <MenuItem onClick={() => {
                    window.open("https://github.com/2maz/slurm-monitor-frontend", "_blank")
                    handleClose()
                }}>
                  <img src={GithubLogo} width="24px" alt="github-logo"/><div className="mx-2">Repository</div>
                </MenuItem>
              </Menu>
            </Paper>
            {view && view == "jobs" && (
              <JobsView
                stateSetters={{
                  columnFilters: jobsFilterState,
                  columnVisibility: jobsVisibilityState,
                }}
                maxHeightInViewportPercent={70}
              />
            )}
            {view && view == "nodes" && (
              <NodesView
                stateSetters={{
                  columnFilters: nodesFilterState,
                  columnVisibility: nodesVisibilityState,
                }}
                maxHeightInViewportPercent={75}
              />
            )}
            {view && view == "partitions" && (
              <PartitionsView
                stateSetters={{
                  columnFilters: partitionsFilterState,
                  columnVisibility: partitionsVisibilityState,
                }}
                maxHeightInViewportPercent={75}
              />
            )}
            {view && view == "gpu_status" && (
              <>
                <h1>GPU Status: {currentTime}</h1>
                <h3>Usage</h3>
                <p>
                  The following nodes statistics are updated every minute. If
                  you cannot see data in the graph the nodes is likely down. In
                  this case check the 'nodes' view.
                </p>
                <p>
                  In order to identify the GPUs which your current job is using,
                  you can double click on the job (in 'jobs' view). The
                  associated GPU charts will be displayed there. Alternatively,
                  you can identify the GPU logical ids from the gres_detail
                  property.
                </p>
                {nodes_info &&
                  Object.keys(nodes_info).map(
                    (nodename) =>
                      nodes_info[nodename].gpus && (
                        <>
                          <div key={nodename}>
                            <GPUStatusView nodename={nodename} />
                          </div>
                        </>
                      )
                  )}
              </>
            )}
            {view && view == "settings" && <SettingsView />}
            {view && view == "query" && <QueryView />}
            { view && view == "inspect-completed-jobs" && <CompletedJobsView
                stateSetters={{
                  columnFilters: completedJobsFilterState,
                  columnVisibility: completedJobsVisibilityState,
                }}
              />
            }
            {view && view == "benchmarks" && <BenchmarksView />}
          </Box>
        </MantineProvider>
      </LocalizationProvider>
    </>
  );
}

export default App;
