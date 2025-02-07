import useAppState from '../../AppState';

const CertificateError = () => {
  const backendUrl = useAppState((state) => state.backendUrl);
  return <div>
      This might be a self-signed certificate issue.
      Go to <a href={backendUrl}>{backendUrl} </a>
      and if you are warned about a self-signed certificate exception, add a permanent exception for this site.
    </div>
}

export default CertificateError