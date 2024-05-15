import {
  Button,
  FormGroup,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FieldValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { Divider } from "@mantine/core";
import axios, { AxiosResponse } from "axios";
import { useQuery } from "@tanstack/react-query";
import MLFlowSlurmMapper, { MLFlowSlurmRunInfo} from "../../services/slurm-monitor/mlflow";

const MLFLOW_STORAGE_KEY = "mlflow-urls";
const MLFLOW_VALIDATION_SUFFIX = "/api/2.0/mlflow/experiments/search?max_results=1"

const schema = z.object({
  url: z.string().min(5).url(),
});

type FormData = z.infer<typeof schema>;

const getUrls = () => {
  const urls = window.localStorage.getItem(MLFLOW_STORAGE_KEY);
  if (urls !== null) return JSON.parse(urls);
  return [];
};

interface ValidatedLinkProps {
  href: string;
  variant: any;
  children: string;
  validate?: string;
}

const ValidatedLink = ({
  href,
  variant,
  children,
  validate = ""
}: ValidatedLinkProps) => {
  const [error, setError] = useState('');
  const validationLink = validate !== "" ? validate : href;

  const controller = new AbortController();
  const client = axios.create({signal: controller.signal})

  /// check
  const urlQuery = () => client.get(validationLink)
        .then(() => {
          setError('');
          return "active";
        })
        .catch((reason) => {
          controller.abort();
          console.log("REASON", reason);
          setError(reason.message);
          return "inaccessible";
        });

  const { data } = useQuery({
    queryKey: ["url-query", href],
    queryFn: urlQuery,
    initialData: "unknown",
    refetchInterval: 5*60*1000,
  });

  return (
    <>
      <Link
        key={href}
        href={href}
        className={
          data === "active"
            ? ""
            : data === "unknown"
            ? "text-muted"
            : "text-danger"
        }
        variant={variant}
      >
        {children}{' '}
      </Link>
      {error && <ListItemText className="mx-3 h1 text-danger" primaryTypographyProps={{fontSize: '0.5em' }} primary={"(" + error + ")"}/>}
    </>
  );
};

const SettingsView = () => {
  const [value, setValue] = useState("1");
  const [urls, setUrls] = useState<string[]>(getUrls());
  const [slurmJobs, setSlurmJobs] = useState<MLFlowSlurmRunInfo[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });


  const onSubmit = (data: FieldValues) => {
    const urls = window.localStorage.getItem(MLFLOW_STORAGE_KEY);

    if (urls === null) {
      const newUrls = [data.url];
      window.localStorage.setItem(MLFLOW_STORAGE_KEY, JSON.stringify(newUrls));
      setUrls(newUrls);
    } else {
      const existingUrls: string[] = JSON.parse(urls);
      if (existingUrls.includes(data.url)) return;

      const newUrls = [...existingUrls, data.url];
      window.localStorage.setItem(MLFLOW_STORAGE_KEY, JSON.stringify(newUrls));
      setUrls(newUrls);
    }

    reset();
  };

  const handleRemoveUrl = (url: string) => {
    const data = window.localStorage.getItem(MLFLOW_STORAGE_KEY);
    if (data === null) return;

    const existingUrls: string[] = JSON.parse(data);
    if (!existingUrls.includes(url)) return;

    const newUrls = existingUrls.filter((u) => u !== url);
    window.localStorage.setItem(MLFLOW_STORAGE_KEY, JSON.stringify(newUrls));
    setUrls(newUrls);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <>
      <Typography sx={{ mt: 4, mb: 2 }} variant="h2" component="div">
        Settings
      </Typography>
      <TabContext value={value}>
        <TabList onChange={handleTabChange} aria-label="Tabs">
          <Tab label="MLFlow" value="1" />
        </TabList>
        <TabPanel value="1">
          <div className="mx-3">
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormGroup row>
                <TextField
                  error={Boolean(errors.url)}
                  {...register("url")}
                  id="url"
                  variant="outlined"
                  label="Url"
                  helperText={errors.url?.message}
                />
                <Button
                  variant="contained"
                  endIcon={<SaveIcon />}
                  type="submit"
                  disableElevation
                >
                  Save
                </Button>
              </FormGroup>
            </form>
            <Divider className="my-5" />
            <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
              MLFlow Instances
            </Typography>
            <List dense={true}>
              {urls &&
                urls.map((url) => (
                  <>
                    <ListItem key={url} id={url}>
                      <ListItemButton
                        sx={{ maxWidth: 50 }}
                        onClick={() => {
                          handleRemoveUrl(url);
                        }}
                        aria-label="delete"
                      >
                        <DeleteIcon />
                      </ListItemButton>
                      <MLFlowSlurmMapper url={url} updateFn={(runs : MLFlowSlurmRunInfo[]) => {
                        const newSlurmJobs : MLFlowSlurmRunInfo[] = slurmJobs.filter((info : MLFlowSlurmRunInfo) => !info.mlflow_run_uri?.startsWith(url)).concat(runs);
                        setSlurmJobs(newSlurmJobs);
                      }}/>
                      <ValidatedLink href={url} validate={url + MLFLOW_VALIDATION_SUFFIX} variant="h6">
                        {url}
                      </ValidatedLink>
                    </ListItem>
                  </>
                ))}
            </List>
          </div>
        </TabPanel>
      </TabContext>
    </>
  );
};

export default SettingsView;
