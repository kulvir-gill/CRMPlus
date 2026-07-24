namespace CRMPlus.Api.Models;

public enum QuoteStatus { Draft, Active, Won, Cancelled }

public class Quote
{
    public Guid Id { get; set; }
    public string QuoteNumber { get; set; } = "";
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    public Guid? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public Guid? QuoteTemplateId { get; set; }
    public QuoteTemplate? QuoteTemplate { get; set; }
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public int Version { get; set; } = 1;
    public bool AuditEnabled { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime? ValidUntil { get; set; }
    public string? Notes { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DocumentGeneratedAt { get; set; }
    public DateTime? SentToCustomerAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public ICollection<QuoteLineItem> LineItems { get; set; } = [];
}

public class QuoteLineItem
{
    public Guid Id { get; set; }
    public Guid QuoteId { get; set; }
    public Quote? Quote { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;
    public decimal Total { get; set; }
}
