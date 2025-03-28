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
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import AppsIcon from '@mui/icons-material/Apps';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InventoryIcon from '@mui/icons-material/Inventory';
import AvTimerIcon from '@mui/icons-material/AvTimer';
import CloudCircleIcon from '@mui/icons-material/CloudCircle';

import JobsView, { CompletedJobsView } from "./components/JobsView";
import PartitionsView from "./components/PartitionsView";
import GPUStatusView from "./components/GPUStatusView";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import NodesView from "./components/NodesView";

import SettingsView from "./components/SettingsView";
import useAppState from "./AppState";
import MLFlowSlurmMapper, {
  MLFlowSlurmRunInfo,
} from "./services/slurm-monitor/mlflow";

import useNodesInfo from "./hooks/useNodesInfos";
import QueryView from "./components/QueryView";
import BenchmarksView from "./components/BenchmarksView";

import GithubLogo from "./assets/github-mark.png"
import ClusterView from "./components/ClusterView";

const theme = createTheme({});

function App() {
  /// State that remembers the currently selected view (one of partitions, nodes, jobs)
  const [view, setView] = useState<string>(
    window.sessionStorage.getItem("view") || "jobs"
  );
  const { data: nodes_info } = useNodesInfo();

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
            {view && view == "cluster" && (
              <ClusterView />
            )}
            {false && view && view == "jobs" && (
              <JobsView maxHeightInViewportPercent={70} />
            )}
            {view && view == "nodes" && (
              <NodesView maxHeightInViewportPercent={75} />
            )}
            {false && view && view == "partitions" && (
              <PartitionsView maxHeightInViewportPercent={75} />
            )}
            {false && view && view == "gpu_status" && (
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
                {nodes_info && Object.entries(nodes_info!).map(
                    ([nodename, config]) =>
                      config.cards && (
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
            {false && view && view == "query" && <QueryView />}
            { view && view == "inspect-completed-jobs" && <CompletedJobsView />
            }
            {false && view && view == "benchmarks" && <BenchmarksView />}
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </>
  );
}

export default App;
