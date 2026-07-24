namespace CRMPlus.Api.DTOs;

public record VendorRequest(
    string Name,
    string? ContactName,
    string? Email,
    string? Phone,
    string? Address,
    bool AuditEnabled = false,
    bool IsActive = true,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null);

public record VendorListResponse(List<VendorResponse> Items, int TotalCount);

public record VendorResponse(
    Guid Id,
    string Name,
    string? ContactName,
    string? Email,
    string? Phone,
    string? Address,
    bool AuditEnabled,
    bool IsActive,
    DateTime CreatedAt,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
