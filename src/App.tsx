import { useEffect, useState } from "react";
import "./App.css";

import { createTheme } from '@mui/material/styles'
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { BottomNavigation, BottomNavigationAction, Box, Paper, ThemeProvider } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";
import SettingsIcon from "@mui/icons-material/Settings";
import AppsIcon from '@mui/icons-material/Apps';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InventoryIcon from '@mui/icons-material/Inventory';
import AvTimerIcon from '@mui/icons-material/AvTimer';
import CloudCircleIcon from '@mui/icons-material/CloudCircle';

import JobsView, { CompletedJobsView } from "./components/JobsView";
import PartitionsView from "./components/PartitionsView";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import NodesView from "./components/NodesView";

import SettingsView from "./components/SettingsView";
import useAppState from "./AppState";
import MLFlowSlurmMapper, {
  MLFlowSlurmRunInfo,
} from "./services/slurm-monitor/mlflow";

import QueryView from "./components/QueryView";
import BenchmarksView from "./components/BenchmarksView";

import GithubLogo from "./assets/github-mark.png";
import ClusterView from "./components/ClusterView";

import { ErrorBoundary } from 'react-error-boundary';

const theme = createTheme({});

interface Props {
  error: Error
}

function fallbackRender({ error } : Props) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div role="alert">
      <p>Ups. Sorry, but something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}

function App() {
  /// State that remembers the currently selected view (one of partitions, nodes, jobs)
  const [view, setView] = useState<string>(
    window.sessionStorage.getItem("view") || "jobs"
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const mlflowUrls = useAppState((state) => state.mlflowUrls);
  const slurmJobs = useAppState((state) => state.slurmRuns);
  const setSlurmJobs = useAppState((state) => state.updateSlurmRuns);

  useEffect(() => {
    document.title = "ex3 - Status: " + view;
  });

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
        <ThemeProvider theme={theme}>
          <Box sx={{ border: '0px'}}>
            <Paper elevation={0}>
              <BottomNavigation showLabels value={view}>
                <BottomNavigationAction
                   label="Cluster"
                   icon={<CloudCircleIcon />}
                   onClick={() => selectView("cluster")}
                />
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
            {view && view == "cluster" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <ClusterView />
              </ErrorBoundary>
            }
            {view && view == "jobs" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <JobsView maxHeightInViewportPercent={70} />
              </ErrorBoundary>
            }
            {view && view == "nodes" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <NodesView maxHeightInViewportPercent={75} />
              </ErrorBoundary>
            }
            {view && view == "partitions" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <PartitionsView maxHeightInViewportPercent={75} />
              </ErrorBoundary>
            }
            {view && view == "settings" &&

            <ErrorBoundary fallbackRender={fallbackRender}>
              <SettingsView />
            </ErrorBoundary>
            }
            {view && view == "query" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <QueryView />
              </ErrorBoundary>
            }
            {view && view == "inspect-completed-jobs" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <CompletedJobsView />
              </ErrorBoundary>
            }
            {false && view && view == "benchmarks" &&
              <ErrorBoundary fallbackRender={fallbackRender}>
                <BenchmarksView />
              </ErrorBoundary>
            }
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </>
  );
}

export default App;
