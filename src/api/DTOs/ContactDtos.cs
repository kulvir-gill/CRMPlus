namespace CRMPlus.Api.DTOs;

public record ContactRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Title,
    Guid? AccountId,
    bool AuditEnabled = false,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null,
    bool IsActive = true);

public record ContactListResponse(
    List<ContactResponse> Items,
    int TotalCount);

public record ContactResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Title,
    Guid? AccountId,
    string? AccountName,
    bool AuditEnabled,
    DateTime CreatedAt,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName,
    bool IsActive);
