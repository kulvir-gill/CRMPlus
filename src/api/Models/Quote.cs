namespace CRMPlus.Api.Models;

public enum QuoteStatus { Draft, Sent, Accepted, Rejected, Expired }

public class Quote
{
    public int Id { get; set; }
    public string QuoteNumber { get; set; } = "";
    public int AccountId { get; set; }
    public Account? Account { get; set; }
    public int? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public DateTime? ValidUntil { get; set; }
    public string? Notes { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<QuoteLineItem> LineItems { get; set; } = [];
}

public class QuoteLineItem
{
    public int Id { get; set; }
    public int QuoteId { get; set; }
    public Quote? Quote { get; set; }
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}
