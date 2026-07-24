namespace CRMPlus.Api.DTOs;

public record AccountRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Industry,
    decimal TaxRate = 0,
    bool AuditEnabled = false,
    bool IsActive = true,
    Guid? PrimaryContactId = null,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null,
    AddressDto? PrimaryAddress = null,
    List<AccountAddressRequest>? Addresses = null);

public record AccountListResponse(
    List<AccountResponse> Items,
    int TotalCount);

public record AccountBulkStatusRequest(
    List<Guid> Ids,
    bool IsActive);

public record AccountResponse(
    Guid Id,
    string AccountNumber,
    string Name,
    string? Phone,
    string? Email,
    string? Industry,
    decimal TaxRate,
    bool AuditEnabled,
    bool IsActive,
    DateTime CreatedAt,
    int ContactCount,
    int ActivityCount,
    Guid? PrimaryContactId,
    string? PrimaryContactName,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName,
    AddressDto? PrimaryAddress,
    List<AccountAddressDto> Addresses);
