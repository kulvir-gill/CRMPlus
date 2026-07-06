namespace CRMPlus.Api.DTOs;

public record AccountRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Website,
    string? Address,
    string? Industry,
    bool AuditEnabled = false);

public record AccountResponse(
    int Id,
    string Name,
    string? Phone,
    string? Email,
    string? Website,
    string? Address,
    string? Industry,
    bool AuditEnabled,
    DateTime CreatedAt,
    int ContactCount,
    int ActivityCount);
