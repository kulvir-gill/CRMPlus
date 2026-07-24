using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record OrderLineItemRequest(Guid? ProductId, string Description, decimal Quantity, decimal UnitPrice, decimal Discount = 0, decimal QuantityFulfilled = 0);

public record OrderRequest(
    Guid AccountId,
    Guid? ContactId,
    bool IsActive,
    string? Notes,
    decimal TaxRate,
    List<OrderLineItemRequest> LineItems,
    decimal Discount = 0,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null);

public record SetFulfillmentStageRequest(string Stage);

public record SetQuantityFulfilledRequest(decimal QuantityFulfilled);

public record OrderLineItemResponse(Guid Id, Guid? ProductId, string? ProductNumber, string? ProductName, string Description, decimal Quantity, decimal UnitPrice, decimal Discount, decimal Total, decimal QuantityFulfilled);

public record OrderListResponse(List<OrderResponse> Items, int TotalCount);

public record OrderResponse(
    Guid Id,
    string OrderNumber,
    Guid? QuoteId,
    string? QuoteNumber,
    Guid? InvoiceId,
    string? InvoiceNumber,
    Guid AccountId,
    string AccountName,
    string? AccountPhone,
    string? AccountEmail,
    AddressDto? AccountAddress,
    Guid? ContactId,
    string? ContactName,
    bool IsActive,
    string FulfillmentStage,
    string? Notes,
    decimal TaxRate,
    decimal Discount,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    DateTime CreatedAt,
    List<OrderLineItemResponse> LineItems,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
