namespace CRMPlus.Api.Models;

public class QuoteSettings
{
    public Guid Id { get; set; }
    public int DefaultValidityDays { get; set; } = 30;
    public string? DocumentLocation { get; set; }
}
