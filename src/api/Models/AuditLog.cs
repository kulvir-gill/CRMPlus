namespace CRMPlus.Api.Models;

public enum AuditAction { Created, Updated, Deleted }

public class AuditLog
{
    public int Id { get; set; }
    public string EntityName { get; set; } = "";
    public int EntityId { get; set; }
    public AuditAction Action { get; set; }
    public int? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
