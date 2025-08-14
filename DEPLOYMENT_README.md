# Deployment Pipelines for Teams Application

This repository contains deployment pipelines for deploying the Teams application frontend to Azure Static Web Apps across multiple environments (Dev, Test, Production).

## Pipeline Files

### Azure DevOps
- **`azure-pipelines.yml`** - Main pipeline configuration
- **`templates/deploy-static-web-app.yml`** - Reusable deployment template

### GitHub Actions
- **`.github/workflows/deploy-teams-app.yml`** - Complete workflow for all environments

## Environment Strategy

### Development Environment
- **Trigger**: Pushes to `develop` branch
- **Static Web App**: `teams-app-dev`
- **URL**: `https://teams-app-dev.azurestaticapps.net`

### Test Environment
- **Trigger**: After successful Dev deployment (develop branch only)
- **Static Web App**: `teams-app-test`
- **URL**: `https://teams-app-test.azurestaticapps.net`

### Production Environment
- **Trigger**: Pushes to `main` branch
- **Static Web App**: `teams-app-prod`
- **URL**: `https://teams-app-prod.azurestaticapps.net`

## Prerequisites

### Azure Resources
Create the following Azure Static Web Apps in your subscription:

```bash
# Create resource groups
az group create --name rg-teams-app-dev --location "East US"
az group create --name rg-teams-app-test --location "East US"
az group create --name rg-teams-app-prod --location "East US"

# Create Static Web Apps
az staticwebapp create --name teams-app-dev --resource-group rg-teams-app-dev --location "East US"
az staticwebapp create --name teams-app-test --resource-group rg-teams-app-test --location "East US"
az staticwebapp create --name teams-app-prod --resource-group rg-teams-app-prod --location "East US"
```

### Get Deployment Tokens
Retrieve the deployment tokens for each Static Web App:

```bash
# Get deployment tokens
az staticwebapp secrets list --name teams-app-dev --resource-group rg-teams-app-dev --query "properties.apiKey" -o tsv
az staticwebapp secrets list --name teams-app-test --resource-group rg-teams-app-test --query "properties.apiKey" -o tsv
az staticwebapp secrets list --name teams-app-prod --resource-group rg-teams-app-prod --query "properties.apiKey" -o tsv
```

## Configuration

### Azure DevOps Setup

1. **Create Variable Groups** in Azure DevOps Library:
   - `teams-app-dev-vars`
   - `teams-app-test-vars`  
   - `teams-app-prod-vars`

2. **Configure Pipeline Variables**:

#### Development Variables
```yaml
AZURE_STATIC_WEB_APPS_API_TOKEN_DEV: "<dev-deployment-token>"
VITE_CLIENT_ID_DEV: "<dev-client-id>"
VITE_FUNC_ENDPOINT_DEV: "<dev-function-endpoint>"
VITE_DOTNET_FUNC_ENDPOINT_DEV: "<dev-dotnet-endpoint>"
VITE_ACS_ENDPOINT_DEV: "<dev-acs-endpoint>"
```

#### Test Variables
```yaml
AZURE_STATIC_WEB_APPS_API_TOKEN_TEST: "<test-deployment-token>"
VITE_CLIENT_ID_TEST: "<test-client-id>"
VITE_FUNC_ENDPOINT_TEST: "<test-function-endpoint>"
VITE_DOTNET_FUNC_ENDPOINT_TEST: "<test-dotnet-endpoint>"
VITE_ACS_ENDPOINT_TEST: "<test-acs-endpoint>"
```

#### Production Variables
```yaml
AZURE_STATIC_WEB_APPS_API_TOKEN_PROD: "<prod-deployment-token>"
VITE_CLIENT_ID_PROD: "<prod-client-id>"
VITE_FUNC_ENDPOINT_PROD: "<prod-function-endpoint>"
VITE_DOTNET_FUNC_ENDPOINT_PROD: "<prod-dotnet-endpoint>"
VITE_ACS_ENDPOINT_PROD: "<prod-acs-endpoint>"
```

3. **Create Environments** in Azure DevOps:
   - Development
   - Test
   - Production

### GitHub Actions Setup

1. **Create Repository Secrets** in GitHub Settings > Secrets and variables > Actions:

#### Secrets
```
AZURE_STATIC_WEB_APPS_API_TOKEN_DEV
AZURE_STATIC_WEB_APPS_API_TOKEN_TEST
AZURE_STATIC_WEB_APPS_API_TOKEN_PROD
VITE_CLIENT_ID_DEV
VITE_CLIENT_ID_TEST
VITE_CLIENT_ID_PROD
VITE_FUNC_ENDPOINT_DEV
VITE_FUNC_ENDPOINT_TEST
VITE_FUNC_ENDPOINT_PROD
VITE_DOTNET_FUNC_ENDPOINT_DEV
VITE_DOTNET_FUNC_ENDPOINT_TEST
VITE_DOTNET_FUNC_ENDPOINT_PROD
VITE_ACS_ENDPOINT_DEV
VITE_ACS_ENDPOINT_TEST
VITE_ACS_ENDPOINT_PROD
```

#### Variables
```
VITE_FUNC_NAME=getUserProfile
```

2. **Create Environments** in GitHub Settings > Environments:
   - Development
   - Test  
   - Production

## Deployment Flow

### Development Workflow
1. Push changes to `develop` branch
2. Pipeline triggers Dev deployment
3. After Dev succeeds, Test deployment starts
4. Both environments are updated automatically

### Production Workflow
1. Create PR from `develop` to `main`
2. Merge PR to `main` branch
3. Pipeline triggers Production deployment
4. Production environment is updated

## Monitoring and Troubleshooting

### Azure DevOps
- View pipeline runs in Azure DevOps Pipelines
- Check environment deployment history
- Review logs for each stage

### GitHub Actions
- View workflow runs in GitHub Actions tab
- Check environment deployment status
- Review job logs for debugging

### Static Web Apps
Monitor deployments in Azure Portal:
- Resource > Deployment History
- Resource > Configuration (environment variables)
- Resource > Custom domains (if configured)

## Security Considerations

1. **Secrets Management**: All sensitive values are stored as pipeline secrets/variables
2. **Environment Isolation**: Each environment has separate Azure resources
3. **Branch Protection**: Production deploys only from `main` branch
4. **Manual Approvals**: Configure environment approvals for sensitive deployments

## Customization

### Adding New Environments
1. Create new Azure Static Web App
2. Add environment-specific variables/secrets
3. Update pipeline with new stage/job
4. Configure environment approvals if needed

### Modifying Build Process
- Update `npm run build` command in pipelines
- Modify environment variable creation steps
- Add additional build steps (linting, testing, etc.)

### Custom Domains
Configure custom domains in Azure Static Web Apps:
```bash
az staticwebapp hostname set --name teams-app-prod --hostname your-domain.com
```

## Support

For issues with:
- **Azure Static Web Apps**: Check Azure Portal logs and deployment history
- **Pipeline Configuration**: Review variable/secret configuration
- **Build Failures**: Check Node.js version compatibility and dependency issues
- **Environment Variables**: Verify all required secrets are configured
