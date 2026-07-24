namespace CRMPlus.Api.Models;

public class QuoteTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    public string? Notes { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<QuoteTemplateLineItem> LineItems { get; set; } = [];
}

public class QuoteTemplateLineItem
{
    public Guid Id { get; set; }
    public Guid QuoteTemplateId { get; set; }
    public QuoteTemplate? QuoteTemplate { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;
}
