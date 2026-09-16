import { Platform } from "react-native";
import { DOMAIN } from "shared/SharedConstants";

export const PRIVACY_POLICY_URL = `https://${DOMAIN}/privacy`;
export const TERMS_OF_SERVICE_URL = `https://${DOMAIN}/terms`;
export const BACKEND_URL = `http://${Platform.OS === "android" ? "10.0.2.2" : "localhost"}:5100`;
export const DEBUG_WEBSOCKET = false;
export const PROJECTS_PER_PAGE = 10;
export const DISABLE_LOGIN_SCREEN = false;
