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

import useAppState from '../../AppState';

const MLFLOW_VALIDATION_SUFFIX = "/api/2.0/mlflow/experiments/search?max_results=1"

const schema = z.object({
  url: z.string().min(5).url(),
});

type FormData = z.infer<typeof schema>;

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
  const [tabValue, setTabValue] = useState("1");
  const urls = useAppState((state) => state.mlflowUrls);
  const setUrls = useAppState((state) => state.updateMlflowUrls);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });


  const onSubmit = (data: FieldValues) => {
    const newUrls = [...urls, data.url];
    setUrls(newUrls);
    reset();
  };

  const handleRemoveUrl = (url: string) => {
    if (!urls.includes(url)) return;

    const newUrls = urls.filter((u: string) => u !== url);
    setUrls(newUrls);
  };

  const handleTabChange = (event: React.SyntheticEvent, newTabValue: string) => {
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
