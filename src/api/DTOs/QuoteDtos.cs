using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record QuoteLineItemRequest(int? ProductId, string Description, decimal Quantity, decimal UnitPrice);

public record QuoteRequest(
    int AccountId,
    int? ContactId,
    QuoteStatus Status,
    DateTime? ValidUntil,
    string? Notes,
    decimal TaxRate,
    List<QuoteLineItemRequest> LineItems);

public record QuoteLineItemResponse(int Id, int? ProductId, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Total);

public record QuoteResponse(
    int Id,
    string QuoteNumber,
    int AccountId,
    string AccountName,
    int? ContactId,
    string? ContactName,
    string Status,
    DateTime? ValidUntil,
    string? Notes,
    decimal TaxRate,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    DateTime CreatedAt,
    List<QuoteLineItemResponse> LineItems);
