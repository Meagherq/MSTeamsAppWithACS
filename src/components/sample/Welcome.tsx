import { useContext, useState } from "react";
import {
  Image,
  TabList,
  Tab,
  SelectTabEvent,
  SelectTabData,
  TabValue,
  Button,
} from "@fluentui/react-components";
import "./Welcome.css";
import { EditCode } from "./EditCode";
import { AzureFunctions } from "./AzureFunctions";
import { CurrentUser } from "./CurrentUser";
import { useData } from "@microsoft/teamsfx-react";
import { Deploy } from "./Deploy";
import { Publish } from "./Publish";
import { Voice } from "./Voice";
import { app } from "@microsoft/teams-js";
import * as axios from "axios";
import config from "./lib/config";
import { TeamsFxContext } from "../Context";
import { useNavigate } from "react-router-dom";
import { BearerTokenAuthProvider, createApiClient, TeamsUserCredential } from "@microsoft/teamsfx";

export function Welcome(props: { showFunction?: boolean; environment?: string; }) {
  const navigate = useNavigate();
  const { showFunction, environment } = {
    showFunction: true,
    environment: window.location.hostname === "localhost" ? "local" : "azure",
    ...props,
  };
  const friendlyEnvironmentName =
    {
      local: "local environment",
      azure: "Azure environment",
    }[environment] || "local environment";

  const [selectedValue, setSelectedValue] = useState<TabValue>("local");

  const onTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };
  const { teamsUserCredential } = useContext(TeamsFxContext);
  const { loading, data, error } = useData(async () => {
    if (teamsUserCredential) {
      const userInfo = await teamsUserCredential.getUserInfo();
      const token = await teamsUserCredential.getToken("");
      const functionRes = await callFunction(teamsUserCredential);
      return {userInfo, displayName: userInfo.displayName, token, cToken: functionRes.token, newUserId: functionRes.newUserId, newUserToken: functionRes.newUserToken};
    }
  });
  const userName = loading || error ? "" : data!.displayName;
  const hubName = useData(async () => {
    await app.initialize();
    const context = await app.getContext();
    return context.app.host.name;
  })?.data;
  return (
    <div className="welcome page">
      <div className="narrow page-padding">
        <Image src="hello.png" />
        <h1 className="center">Congratulations{userName ? ", " + userName : ""}!</h1>
        {hubName && <p className="center">Your app is running in {hubName}</p>}
        <p className="center">Your app is running in your {friendlyEnvironmentName}</p>

        {(data && 
        data.displayName && 
        data.userInfo.objectId && 
        data.cToken && 
        data.newUserId && 
        data.newUserToken) && 
        <Voice displayName={ data.displayName } objectId={data.userInfo.objectId} cToken={data.cToken} newUserId={data.newUserId} newUserToken={data.newUserToken} />}
      </div>
    </div>
  );
}

async function callFunction(teamsUserCredential: TeamsUserCredential) {
  try {
    const apiBaseUrl = config.useDotnetBackend === "true" ? config.acsDotnetEndpoint + "/Identity/" : config.apiEndpoint + "/api/";
    // createApiClient(...) creates an Axios instance which uses BearerTokenAuthProvider to inject token to request header
    const apiClient = createApiClient(
      apiBaseUrl,
      new BearerTokenAuthProvider(async () => (await teamsUserCredential.getToken(""))!.token)
    );
    const response = await apiClient.get("exchangeToken");
    return response.data;
  } catch (err: unknown) {
    if (axios.default.isAxiosError(err)) {
      let funcErrorMsg = "";

      if (err?.response?.status === 404) {
        funcErrorMsg = `There may be a problem with the deployment of Azure Functions App, please deploy Azure Functions (Run command palette "Microsoft 365 Agents: Deploy") first before running this App`;
      } else if (err.message === "Network Error") {
        funcErrorMsg =
          "Cannot call Azure Functions due to network error, please check your network connection status and ";
        if (err.config?.url && err.config.url.indexOf("localhost") >= 0) {
          funcErrorMsg += `make sure to start Azure Functions locally (Run "npm run start" command inside api folder from terminal) first before running this App`;
        } else {
          funcErrorMsg += `make sure to provision and deploy Azure Functions (Run command palette "Microsoft 365 Agents: Provision" and "Microsoft 365 Agents: Deploy") first before running this App`;
        }
      } else {
        funcErrorMsg = err.message;
        if (err.response?.data?.error) {
          funcErrorMsg += ": " + err.response.data.error;
        }
      }

      throw new Error(funcErrorMsg);
    }
    throw err;
  }
}
