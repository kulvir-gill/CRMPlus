using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record InvoiceLineItemRequest(Guid? ProductId, string Description, decimal Quantity, decimal UnitPrice);

public record InvoiceRequest(
    Guid AccountId,
    Guid? ContactId,
    Guid? QuoteId,
    InvoiceStatus Status,
    DateTime? DueDate,
    string? Notes,
    decimal TaxRate,
    List<InvoiceLineItemRequest> LineItems,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null,
    Guid? OrderId = null);

public record InvoiceLineItemResponse(Guid Id, Guid? ProductId, string? ProductNumber, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Total);

public record InvoiceResponse(
    Guid Id,
    string InvoiceNumber,
    Guid AccountId,
    string AccountName,
    Guid? ContactId,
    string? ContactName,
    Guid? QuoteId,
    Guid? OrderId,
    string? OrderNumber,
    string Status,
    DateTime? DueDate,
    string? Notes,
    decimal TaxRate,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    DateTime CreatedAt,
    List<InvoiceLineItemResponse> LineItems,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
