namespace CRMPlus.Api.Models;

public class Address
{
    public Guid Id { get; set; }
    public Guid? AccountId { get; set; }
    public Account? Account { get; set; }
    public string? AddressType { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? County { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
}
