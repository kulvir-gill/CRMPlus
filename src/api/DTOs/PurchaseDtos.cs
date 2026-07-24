namespace CRMPlus.Api.DTOs;

public record PurchaseRequest(
    Guid ProductId,
    Guid? VendorId,
    string Currency,
    string UnitOfMeasure,
    decimal Quantity,
    decimal Price,
    string Status,
    bool AuditEnabled = false,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null);

public record PurchaseResponse(
    Guid Id,
    Guid ProductId,
    Guid? VendorId,
    string? VendorName,
    string Currency,
    string UnitOfMeasure,
    decimal Quantity,
    decimal Price,
    string Status,
    DateTime CreatedAt,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
