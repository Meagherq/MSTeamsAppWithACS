/* This code sample provides a starter kit to implement server side logic for your App in TypeScript,
 * refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for complete Azure Functions
 * developer guide.
 */

// Import polyfills for fetch required by msgraph-sdk-javascript.
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import {
  OnBehalfOfCredentialAuthConfig,
  OnBehalfOfUserCredential,
  UserInfo,
} from "@microsoft/teamsfx";
import config from "../config";
import { CommunicationIdentityClient } from '@azure/communication-identity';
import { ClientSecretCredential } from "@azure/identity";
/**
 * This function handles requests from teamsapp client.
 * The HTTP request should contain an SSO token queried from Teams in the header.
 *
 * This function initializes the teamsapp SDK with the configuration and calls these APIs:
 * - new OnBehalfOfUserCredential(accessToken, oboAuthConfig) - Construct OnBehalfOfUserCredential instance with the received SSO token and initialized configuration.
 * - exchangeToken() - Exchanges the Teams SSO token for an ACS Token.
 *
 * The response contains multiple message blocks constructed into a JSON object, including:
 * - An echo of the request body.
 * - The display name encoded in the SSO token.
 * - ACS Token.
 *
 * @param {InvocationContext} context - The Azure Functions context object.
 * @param {HttpRequest} req - The HTTP request.
 */



export async function exchangeToken(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("HTTP trigger function processed a request.");

  const clientCredential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );

  const applicationClient = new CommunicationIdentityClient(config.acsEndpoint, clientCredential);
  // Initialize response.
  const res: HttpResponseInit = {
    status: 200,
  };
  const body = Object();

  // Put an echo into response body.
  body.receivedHTTPRequestBody = (await req.text()) || "";

  // Prepare access token.
  const accessToken: string = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!accessToken) {
    return {
      status: 400,
      body: JSON.stringify({
        error: "No access token was found in request header.",
      }),
    };
  }

  const oboAuthConfig: OnBehalfOfCredentialAuthConfig = {
    authorityHost: config.authorityHost,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  };

  let oboCredential: OnBehalfOfUserCredential;
  try {
    oboCredential = new OnBehalfOfUserCredential(accessToken, oboAuthConfig);
  } catch (e) {
    context.error(e);
    return {
      status: 500,
      body: JSON.stringify({
        error:
          "Failed to construct OnBehalfOfUserCredential using your accessToken. " +
          "Ensure your function app is configured with the right Microsoft Entra App registration.",
      }),
    };
  }

  // Query user's information from the access token.
  try {
    const currentUser: UserInfo = await oboCredential.getUserInfo();
    if (currentUser && currentUser.displayName) {
      body.userInfoMessage = `User display name is ${currentUser.displayName}.`;
    } else {
      body.userInfoMessage = "No user information was found in access token.";
    }
  } catch (e) {
    context.error(e);
    return {
      status: 400,
      body: JSON.stringify({
        error: "Access token is invalid.",
      }),
    };
  }

  try {
    // Create an instance of the TokenCredentialAuthenticationProvider by passing the tokenCredential instance and options to the constructor
    const authProvider = new TokenCredentialAuthenticationProvider(oboCredential, {
      scopes: ["https://auth.msft.communication.azure.com/.default"],
    });
    const newUser = await applicationClient.createUserAndToken(["chat", "voip"]);
    body.newUserId = newUser.user.communicationUserId
    body.newUserToken = newUser.token
    body.token = (await applicationClient.getTokenForTeamsUser({ userObjectId: oboCredential.getUserInfo().objectId, clientId: config.clientId, teamsUserAadToken: await authProvider.getAccessToken() })).token;

  } catch (e) {
    context.error(e);
    return {
      status: 500,
      body: JSON.stringify({
        error:
          "Failed to retrieve user profile from Microsoft Graph. The application may not be authorized.",
      }),
    };
  }
  res.body = JSON.stringify(body);

  return res;
}

app.http("exchangeToken", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: exchangeToken,
});
