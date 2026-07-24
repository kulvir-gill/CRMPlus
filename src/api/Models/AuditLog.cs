namespace CRMPlus.Api.Models;

public enum AuditAction { Created, Updated, Deleted, Associated, Deassociated }

public class AuditLog
{
    public Guid Id { get; set; }
    public string EntityName { get; set; } = "";
    public Guid EntityId { get; set; }
    public AuditAction Action { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public ICollection<AuditLogChange> Changes { get; set; } = [];
}

public class AuditLogChange
{
    public Guid Id { get; set; }
    public Guid AuditLogId { get; set; }
    public AuditLog AuditLog { get; set; } = null!;
    public string FieldName { get; set; } = "";
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
