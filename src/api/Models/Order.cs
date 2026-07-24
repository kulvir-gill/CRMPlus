namespace CRMPlus.Api.Models;

public enum FulfillmentStage { Pending, PartialFulfilled, Fulfilled, FulfillCompleted, Complete }

public class Order
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public Guid? QuoteId { get; set; }
    public Quote? Quote { get; set; }
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    public Guid? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public bool AuditEnabled { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public FulfillmentStage FulfillmentStage { get; set; } = FulfillmentStage.Pending;
    public string? Notes { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<OrderLineItem> LineItems { get; set; } = [];
}

public class OrderLineItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;
    public decimal Total { get; set; }
    public decimal QuantityFulfilled { get; set; } = 0;
}
