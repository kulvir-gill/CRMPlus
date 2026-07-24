namespace CRMPlus.Api.DTOs;

public record AuditLogChangeResponse(
    string FieldName,
    string? OldValue,
    string? NewValue);

public record AuditLogResponse(
    Guid Id,
    string EntityName,
    Guid EntityId,
    string Action,
    Guid? UserId,
    string? UserEmail,
    DateTime Timestamp,
    List<AuditLogChangeResponse> Changes);
