namespace ACSBackend.API.Models
{
    public class AcsTokenResponse
    {
        public string token { get; set; } = string.Empty;
        public string newUserToken { get; set; } = string.Empty;
        public string newUserId { get; set; } = string.Empty;
    }
}
