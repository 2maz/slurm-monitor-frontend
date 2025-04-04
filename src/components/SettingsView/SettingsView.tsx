import { zodResolver } from "@hookform/resolvers/zod";
import Divider from "@mui/material/Divider";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
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
  TypographyOwnProps,
} from "@mui/material";
import Tab from "@mui/material/Tab";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import React, { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import useAppState from '../../AppState';

const MLFLOW_VALIDATION_SUFFIX = "/api/2.0/mlflow/experiments/search?max_results=1"

const schema = z.object({
  url: z.string().min(5).url(),
});

const schemaBackend = z.object({
  backend_id: z.string().min(3),
  url: z.string().min(5).url()
})

type FormData = z.infer<typeof schema>;
type BackendFormData = z.infer<typeof schemaBackend>

interface ValidatedLinkProps {
  href: string;
  variant: TypographyOwnProps['variant'] | undefined;
  children: string | string[];
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
          setError(reason.message as string);
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
  const [tabValue, setTabValue] = useState("1");
  const urls = useAppState((state) => state.mlflowUrls);
  const setUrls = useAppState((state) => state.updateMlflowUrls);

  const appState = useAppState();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const {
    register : registerBackend,
    handleSubmit: handleSubmitBackend,
    reset: resetBackend,
    formState: { errors: errorsBackend, isValid: isValidBackend },
  } = useForm<BackendFormData>({
    resolver: zodResolver(schemaBackend),
  });


  const onSubmit = (data: FieldValues) => {
    const newUrls = [...urls, data.url as string];
    setUrls(newUrls);
    reset();
  };

  const handleRemoveUrl = (url: string) => {
    if (!urls.includes(url)) return;

    const newUrls = urls.filter((u: string) => u !== url);
    setUrls(newUrls);
  };


  const onSubmitBackend = (data: FieldValues) => {
    const backend_id = data.backend_id as string;
    const newUrl = data.url as string;
    appState.addBackendUrl(backend_id, newUrl);
    resetBackend();
  };

  const onRemoveBackend = (backend_id: string) => {
    appState.removeBackendUrl(backend_id);
    resetBackend();
  };

  const onSelectBackend = (backend_id: string) => {
    appState.selectBackend(backend_id);
    resetBackend();
  };

  //const handleRemoveBackendUrl = (url: string) => {
  //  if (backendUrl !== url) return;
  // setBackendUrl(url);
  //};


  const handleTabChange = (_event: React.SyntheticEvent, newTabValue: string) => {
    setTabValue(newTabValue);
  };

  return (
    <>
      <Typography sx={{ mt: 4, mb: 2 }} variant="h2" component="div">
        Settings
      </Typography>
      <TabContext value={tabValue}>
        <TabList onChange={handleTabChange} aria-label="Tabs">
          <Tab label="MLFlow" value="1" />
          <Tab label="Backend" value="2" />
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
                  disabled={!isValid}
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
                  <div key={url}>
                    <ListItem>
                      <ListItemButton
                        sx={{ maxWidth: 50 }}
                        onClick={() => {
                          handleRemoveUrl(url);
                        }}
                        aria-label="delete"
                      >
                        <DeleteIcon />
                      </ListItemButton>
                      <ValidatedLink key={"validate-"+url} href={url} validate={url + MLFLOW_VALIDATION_SUFFIX} variant="h6">
                        {url}
                      </ValidatedLink>
                    </ListItem>
                  </div>
                ))}
            </List>
          </div>
        </TabPanel>
        <TabPanel value="2">
          <div className="mx-3">
            <form onSubmit={handleSubmitBackend(onSubmitBackend)}>
              <FormGroup row>
                <TextField
                  error={Boolean(errorsBackend.backend_id)}
                  {...registerBackend("backend_id")}
                  id="backend_i"
                  variant="outlined"
                  label="Backend Id"
                  helperText={errorsBackend.backend_id?.message}
                />
                <TextField
                  error={Boolean(errorsBackend.url)}
                  {...registerBackend("url")}
                  id="url"
                  variant="outlined"
                  label="Url"
                  helperText={errorsBackend.url?.message}
                />
                <Button
                  variant="contained"
                  endIcon={<SaveIcon />}
                  type="submit"
                  disableElevation
                  disabled={!isValidBackend}
                >
                  Save
                </Button>
              </FormGroup>
            </form>
            <Divider className="my-5" />
            <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
              Current Backends / REST Endpoints
            </Typography>
            <List dense={true}>
              <div key="backend-urls">
              {appState.backendUrls &&
                  Object.keys(appState.backendUrls).map(key => {
                    const backendUrl = appState.backendUrls[key];
                    return (
                    <ListItem>
                      <Button
                          endIcon={<DeleteIcon />}
                          onClick={() => onRemoveBackend(key)}
                          type="button"
                          disableElevation
                      />
                      {appState.currentBackend === key ? 
                        <Button 
                          endIcon={<StarIcon style={{color: "orange" }}/>}
                          type="button"
                          disableElevation
                        /> :
                        <Button 
                          endIcon={<StarBorderIcon style={{ color: 'gray' }} />}
                          onClick={() => onSelectBackend(key)}
                          type="button"
                          disableElevation
                        />
                      }
                      <ValidatedLink key={"validate-"+backendUrl} href={backendUrl + "/api/v1/docs"} validate={backendUrl + "/api/v1/docs"} variant="h6">
                        {key}: {backendUrl}
                      </ValidatedLink>
                    </ListItem>
                  )}
              )}
              </div>
            </List>
          </div>
        </TabPanel>
      </TabContext>
    </>
  );
};

export default SettingsView;
