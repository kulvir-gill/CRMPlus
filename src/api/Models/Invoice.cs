namespace CRMPlus.Api.Models;

public enum InvoiceStatus { Draft, Sent, Paid, Overdue, Cancelled }

public class Invoice
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    public Guid? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public Guid? QuoteId { get; set; }
    public Quote? Quote { get; set; }
    public Guid? OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<InvoiceLineItem> LineItems { get; set; } = [];
}

public class InvoiceLineItem
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}
