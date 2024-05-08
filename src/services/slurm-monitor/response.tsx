import MetaData from "../../components/ResponseMetaData";

interface Response {
  meta: MetaData;
  errors: string[];
}

export default Response;
