# Azure Communication Services - On-Behalf-Of Token Exchange

This API implements the On-Behalf-Of (OBO) flow to exchange a user's Azure AD token for an Azure Communication Services (ACS) token with the scope `https://auth.msft.communication.azure.com/.default`.

## Features

- **Token Exchange**: Converts Azure AD user tokens to ACS tokens using OBO flow
- **ACS User Management**: Creates and manages ACS user identities
- **Token Refresh**: Refreshes ACS tokens for existing users
- **Secure Authentication**: Uses Microsoft Identity Web for secure token handling

## Setup Instructions

### 1. Azure AD App Registration

1. Register an application in Azure AD
2. Configure the following:
   - **API Permissions**: 
     - `https://auth.msft.communication.azure.com/.default` (Application permission)
     - Grant admin consent for the permissions
   - **Expose an API**: Create a scope (e.g., `access_as_user`)
   - **Authentication**: Configure redirect URIs if needed

### 2. Azure Communication Services

1. Create an ACS resource in Azure
2. Get the connection string from the Azure portal
3. Add the connection string to your configuration

### 3. Configuration

Update `appsettings.Development.json` with your values:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "yourdomain.com",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "Scopes": "access_as_user"
  },
  "ConnectionStrings": {
    "AzureCommunicationServices": "your-acs-connection-string"
  }
}
```

## API Endpoints

### POST /Identity/exchange-token

Exchanges the user's Azure AD token for an ACS token.

**Headers:**
```
Authorization: Bearer {azure-ad-token}
```

**Response:**
```json
{
  "token": "acs-access-token",
  "userId": "acs-user-id",
  "expiresOn": "2024-01-01T12:00:00Z",
  "aadObjectId": "azure-ad-object-id"
}
```

### POST /Identity/refresh-acs-token

Refreshes an ACS token for an existing user.

**Headers:**
```
Authorization: Bearer {azure-ad-token}
```

**Body:**
```json
{
  "acsUserId": "existing-acs-user-id"
}
```

**Response:**
```json
{
  "token": "new-acs-access-token",
  "expiresOn": "2024-01-01T12:00:00Z"
}
```

## Usage Example

### From JavaScript/TypeScript

```typescript
// Exchange Azure AD token for ACS token
const response = await fetch('/Identity/exchange-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${azureAdToken}`,
    'Content-Type': 'application/json'
  }
});

const acsTokenData = await response.json();
console.log('ACS Token:', acsTokenData.token);
console.log('ACS User ID:', acsTokenData.userId);
```

### From C# Client

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", azureAdToken);

var response = await client.PostAsync("/Identity/exchange-token", null);
var acsTokenData = await response.Content.ReadFromJsonAsync<AcsTokenResponse>();
```

## Security Considerations

1. **Token Validation**: The API validates the incoming Azure AD token
2. **Scope Verification**: Ensures the user has the required scope
3. **Secure Storage**: Consider using Azure Key Vault for secrets in production
4. **CORS Configuration**: Configure CORS appropriately for your client applications
5. **Token Caching**: Uses in-memory token caching (consider distributed cache for production)

## Troubleshooting

### Common Issues

1. **Invalid Scope Error**: Ensure the Azure AD app has the ACS permission granted
2. **Connection String Error**: Verify the ACS connection string is correct
3. **Token Acquisition Failed**: Check that the client app is properly configured for OBO flow

### Logging

The API includes comprehensive logging. Check the application logs for detailed error information.

## Production Considerations

1. **Distributed Token Cache**: Replace in-memory cache with Redis or SQL Server
2. **Key Vault Integration**: Store secrets in Azure Key Vault
3. **Monitoring**: Add Application Insights for monitoring and telemetry
4. **Rate Limiting**: Implement rate limiting for token requests
5. **CORS**: Configure CORS with specific origins instead of allowing all
