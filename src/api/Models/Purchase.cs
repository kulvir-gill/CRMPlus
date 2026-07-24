namespace CRMPlus.Api.Models;

public enum PurchaseStatus { Draft, Submitted, Ordered, Received, Cancelled }

public class Purchase
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public Guid? VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public string Currency { get; set; } = "USD";
    public string UnitOfMeasure { get; set; } = "each";
    public decimal Quantity { get; set; } = 1;
    public decimal Price { get; set; }
    public PurchaseStatus Status { get; set; } = PurchaseStatus.Draft;
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public bool AuditEnabled { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
