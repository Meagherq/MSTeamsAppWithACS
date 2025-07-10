using Azure.Communication.Identity;
using Microsoft.Identity.Web;

namespace ACSBackend.API.Services
{
    /// <summary>
    /// Configuration extensions for ACS and Azure AD integration
    /// </summary>
    public static class ServiceConfigurationExtensions
    {
        /// <summary>
        /// Configures Azure Communication Services with dependency injection
        /// </summary>
        public static IServiceCollection AddAzureCommunicationServices(
            this IServiceCollection services, 
            IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("AzureCommunicationServices");
            
            if (!string.IsNullOrEmpty(connectionString))
            {
                services.AddSingleton(provider => new CommunicationIdentityClient(connectionString));
            }
            
            return services;
        }

        /// <summary>
        /// Validates that all required configurations are present
        /// </summary>
        public static void ValidateConfiguration(this IConfiguration configuration)
        {
            var requiredSettings = new Dictionary<string, string>
            {
                ["AzureAd:TenantId"] = configuration["AzureAd:TenantId"] ?? "",
                ["AzureAd:ClientId"] = configuration["AzureAd:ClientId"] ?? "",
                ["AzureAd:ClientSecret"] = configuration["AzureAd:ClientSecret"] ?? "",
                ["ConnectionStrings:AzureCommunicationServices"] = 
                    configuration.GetConnectionString("AzureCommunicationServices") ?? ""
            };

            var missingSettings = requiredSettings
                .Where(kvp => string.IsNullOrEmpty(kvp.Value))
                .Select(kvp => kvp.Key)
                .ToList();

            if (missingSettings.Any())
            {
                throw new InvalidOperationException(
                    $"Missing required configuration settings: {string.Join(", ", missingSettings)}");
            }
        }
    }
}
