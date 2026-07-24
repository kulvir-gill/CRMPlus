namespace CRMPlus.Api.DTOs;

public record QuoteTemplateLineItemRequest(Guid? ProductId, string Description, decimal Quantity, decimal UnitPrice, decimal Discount = 0);

public record QuoteTemplateRequest(
    string Name,
    Guid AccountId,
    string? Notes,
    decimal TaxRate,
    decimal Discount,
    List<QuoteTemplateLineItemRequest> LineItems);

public record QuoteTemplateLineItemResponse(Guid Id, Guid? ProductId, string? ProductNumber, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Discount);

public record QuoteTemplateSummaryResponse(Guid Id, string Name, DateTime CreatedAt);

public record QuoteTemplateResponse(
    Guid Id,
    string Name,
    Guid AccountId,
    string? Notes,
    decimal TaxRate,
    decimal Discount,
    DateTime CreatedAt,
    List<QuoteTemplateLineItemResponse> LineItems);
