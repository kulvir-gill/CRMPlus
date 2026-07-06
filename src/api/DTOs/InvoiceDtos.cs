using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record InvoiceLineItemRequest(int? ProductId, string Description, decimal Quantity, decimal UnitPrice);

public record InvoiceRequest(
    int AccountId,
    int? ContactId,
    int? QuoteId,
    InvoiceStatus Status,
    DateTime? DueDate,
    string? Notes,
    decimal TaxRate,
    List<InvoiceLineItemRequest> LineItems);

public record InvoiceLineItemResponse(int Id, int? ProductId, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Total);

public record InvoiceResponse(
    int Id,
    string InvoiceNumber,
    int AccountId,
    string AccountName,
    int? ContactId,
    string? ContactName,
    int? QuoteId,
    string Status,
    DateTime? DueDate,
    string? Notes,
    decimal TaxRate,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    DateTime CreatedAt,
    List<InvoiceLineItemResponse> LineItems);
