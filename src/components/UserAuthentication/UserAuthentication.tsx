import { Button, Typography } from "@mui/material";
import LoginIcon from '@mui/icons-material/Login';
import { redirect_uri } from "../../auth";

import { useKeycloak } from '@react-keycloak/web';

const UserAuthentication = () => {
    const { keycloak, initialized } = useKeycloak()

    if(!initialized) {
        return <div>Loading authentication ...</div>
    }

    const keycloakLogin = () => {
        keycloak.login({ redirectUri: redirect_uri()}).catch((reason) => {
            console.log("Login rejected: " + reason)
        })
    };

    const keycloakLogout = () => {
        keycloak.logout({ redirectUri: window.location.href }).then(() => {
            console.log("Logged out")
        }).catch((error) => 
        {
            console.error("Failed to logout: ", error)
        })
    };

    if(keycloak.authenticated) {
        return <div>
            <Button startIcon={<LoginIcon />} color="primary" onClick={keycloakLogout} >
            <Typography>{keycloak.tokenParsed?.preferred_username}</Typography>
            </Button>
            </div>
    }

    return <div>
        <Button startIcon={<LoginIcon />} color="primary" onClick={keycloakLogin}>
        Login
        </Button>
    </div>
}

export default UserAuthentication