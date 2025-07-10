namespace ACSBackend.API.Models
{
    public class AcsTokenRefreshResponse
    {
        public string Token { get; set; } = string.Empty;
        public DateTimeOffset ExpiresOn { get; set; }
    }
}
