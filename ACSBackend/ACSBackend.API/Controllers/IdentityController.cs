using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;
using Microsoft.Identity.Web;
using Microsoft.Identity.Abstractions;
using Microsoft.Identity.Client;
using Azure.Communication.Identity;
using Azure.Identity;
using System.Security.Claims;
using Azure.Communication;
using ACSBackend.API.Models;
using Microsoft.Extensions.Options;
using ACSBackend.API.Configuration;

namespace ACSBackend.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("[controller]")]
    [RequiredScope(RequiredScopesConfigurationKey = "AzureAd:Scopes")]
    public class IdentityController : ControllerBase
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly ILogger<IdentityController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IOptions<AzureAdOptions> _options;

        public IdentityController(
            ILogger<IdentityController> logger, 
            ITokenAcquisition tokenAcquisition,
            IConfiguration configuration,
            IOptions<AzureAdOptions> options)
        {
            _logger = logger;
            _tokenAcquisition = tokenAcquisition;
            _configuration = configuration;
            _options = options;
        }

        /// <summary>
        /// Exchanges the user's token for an Azure Communication Services token using On-Behalf-Of flow
        /// </summary>
        /// <returns>ACS access token and user identity</returns>
        [HttpPost("exchange-token")]
        public async Task<ActionResult<AcsTokenResponse>> ExchangeTokenAsync()
        {
            try
            {
                _logger.LogInformation("Starting token exchange for ACS");

                // Get the user's Azure AD object ID
                var userObjectId = User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value 
                    ?? User.FindFirst("oid")?.Value;

                if (string.IsNullOrEmpty(userObjectId))
                {
                    _logger.LogError("User object ID not found in claims");
                    return BadRequest("User identity not found");
                }

                // Use On-Behalf-Of flow to get token for ACS scope
                var acsScope = "https://auth.msft.communication.azure.com/.default";
                var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(
                    new[] { acsScope }, 
                    user: User);

                _logger.LogInformation("Successfully acquired token for ACS scope");

                // Get ACS connection string from configuration
                var acsConnectionString = _configuration.GetConnectionString("AzureCommunicationServices");
                if (string.IsNullOrEmpty(acsConnectionString))
                {
                    _logger.LogError("ACS connection string not configured");
                    return StatusCode(500, "ACS not configured");
                }

                // Create ACS identity client
                var identityClient = new CommunicationIdentityClient(acsConnectionString);

                // Create or get ACS user identity
                var acsUser = await identityClient.CreateUserAsync();
                _logger.LogInformation("Created ACS user: {UserId}", acsUser.Value.Id);

                // Create ACS access token with required scopes
                var tokenResponse = await identityClient.GetTokenAsync(
                    acsUser.Value, 
                    scopes: new[] { CommunicationTokenScope.Chat, CommunicationTokenScope.VoIP });

                var ACSTeamsToken = await identityClient.GetTokenForTeamsUserAsync(new GetTokenForTeamsUserOptions(accessToken, _options.Value.ClientId, userObjectId));
                
                _logger.LogInformation("Successfully created ACS access token");

                return Ok(new AcsTokenResponse
                {
                    newUserToken = tokenResponse.Value.Token,
                    newUserId = acsUser.Value.Id,
                    cToken = ACSTeamsToken.Value.Token
                });
            }
            catch (MsalException msalEx)
            {
                _logger.LogError(msalEx, "MSAL error during token acquisition: {Error}", msalEx.Message);
                return StatusCode(500, $"Token acquisition failed: {msalEx.ErrorCode}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token exchange: {Error}", ex.Message);
                return StatusCode(500, "Internal server error during token exchange");
            }
        }

        /// <summary>
        /// Gets ACS token for an existing ACS user identity
        /// </summary>
        /// <param name="acsUserId">The ACS user identifier</param>
        /// <returns>New ACS access token</returns>
        [HttpPost("refresh-acs-token")]
        public async Task<ActionResult<AcsTokenRefreshResponse>> RefreshAcsTokenAsync([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.AcsUserId))
                {
                    return BadRequest("ACS User ID is required");
                }

                _logger.LogInformation("Refreshing ACS token for user: {UserId}", request.AcsUserId);

                // Verify user has access to ACS scope via OBO flow
                var acsScope = "https://auth.msft.communication.azure.com/.default";
                await _tokenAcquisition.GetAccessTokenForUserAsync(
                    new[] { acsScope }, 
                    user: User);

                // Get ACS connection string
                var acsConnectionString = _configuration.GetConnectionString("AzureCommunicationServices");
                if (string.IsNullOrEmpty(acsConnectionString))
                {
                    return StatusCode(500, "ACS not configured");
                }

                var identityClient = new CommunicationIdentityClient(acsConnectionString);
                var acsUser = new CommunicationUserIdentifier(request.AcsUserId);

                // Generate new token for existing user
                var tokenResponse = await identityClient.GetTokenAsync(
                    acsUser, 
                    scopes: new[] { CommunicationTokenScope.Chat, CommunicationTokenScope.VoIP });

                _logger.LogInformation("Successfully refreshed ACS token for user: {UserId}", request.AcsUserId);

                return Ok(new AcsTokenRefreshResponse
                {
                    Token = tokenResponse.Value.Token,
                    ExpiresOn = tokenResponse.Value.ExpiresOn
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing ACS token: {Error}", ex.Message);
                return StatusCode(500, "Internal server error during token refresh");
            }
        }
    }
}

