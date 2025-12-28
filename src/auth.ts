import Keycloak from 'keycloak-js';

const SLURM_MONITOR_AUTH_REQUIRED = (import.meta.env.SLURM_MONITOR_AUTH_REQUIRED || "false") as string;

const SLURM_MONITOR_AUTH_URL = import.meta.env.SLURM_MONITOR_AUTH_URL as string;
const SLURM_MONITOR_AUTH_REALM = import.meta.env.SLURM_MONITOR_AUTH_REALM as string;
const SLURM_MONITOR_AUTH_CLIENT_ID = import.meta.env.SLURM_MONITOR_AUTH_CLIENT_ID as string;

export const auth_required = () : boolean => {
    if(SLURM_MONITOR_AUTH_REQUIRED) {
        if(SLURM_MONITOR_AUTH_REQUIRED.toLowerCase() == "true") {
            return true
        }
    }
    return false
};


const keycloak = new Keycloak({
    url: SLURM_MONITOR_AUTH_URL,
    realm: SLURM_MONITOR_AUTH_REALM,
    clientId: SLURM_MONITOR_AUTH_CLIENT_ID,
    // one cannot use the confidential client from only the frontend, so 
    // one must use the 'public' client apporach
    //clientId: "oauth-client.naic-monitor.simula.no",
    //clientSecret: "BYr1cdBpmqieV6iv8JUmXdmZu50LKWXZ"
})

export default keycloak