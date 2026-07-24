namespace CRMPlus.Api.Models;

public class Product
{
    public Guid Id { get; set; }
    public string ProductNumber { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Unit { get; set; } = "each";
    public Guid? VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public bool AuditEnabled { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
