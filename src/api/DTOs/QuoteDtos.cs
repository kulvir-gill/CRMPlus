using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record QuoteLineItemRequest(Guid? ProductId, string Description, decimal Quantity, decimal UnitPrice, decimal Discount = 0);

public record QuoteRequest(
    Guid AccountId,
    Guid? ContactId,
    bool IsActive,
    string? Notes,
    decimal TaxRate,
    List<QuoteLineItemRequest> LineItems,
    decimal Discount = 0,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null,
    Guid? QuoteTemplateId = null);

public record QuoteLineItemResponse(Guid Id, Guid? ProductId, string? ProductNumber, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Discount, decimal Total);

public record QuoteListResponse(List<QuoteResponse> Items, int TotalCount);

public record QuoteResponse(
    Guid Id,
    string QuoteNumber,
    Guid AccountId,
    string AccountName,
    string? AccountPhone,
    string? AccountEmail,
    AddressDto? AccountAddress,
    Guid? ContactId,
    string? ContactName,
    string Status,
    int Version,
    bool IsActive,
    DateTime? ValidUntil,
    string? Notes,
    decimal TaxRate,
    decimal Discount,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    DateTime CreatedAt,
    DateTime? DocumentGeneratedAt,
    DateTime? SentToCustomerAt,
    DateTime? ApprovedAt,
    Guid? QuoteTemplateId,
    string? QuoteTemplateName,
    Guid? OrderId,
    string? OrderNumber,
    List<QuoteLineItemResponse> LineItems,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
