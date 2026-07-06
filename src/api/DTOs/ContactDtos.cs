namespace CRMPlus.Api.DTOs;

public record ContactRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Title,
    int? AccountId,
    bool AuditEnabled = false);

public record ContactResponse(
    int Id,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Title,
    int? AccountId,
    string? AccountName,
    bool AuditEnabled,
    DateTime CreatedAt);
