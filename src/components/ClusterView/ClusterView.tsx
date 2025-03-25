import useAppState from "../../AppState";

const ClusterView = () => {

  const appState = useAppState();


  return (
    <div>
        <h1>Cluster</h1>
        <h3>Current cluster: {appState.currentBackendSpec().cluster_id}</h3>
        <h3>Known clusters:</h3>
        <ul>
        {Object.entries(appState.backendSpecs).map(([key, { url, cluster_id }]) => <li key={key}>{cluster_id}: {url}</li> )}
        </ul>
    </div>
  )
}

export default ClusterView