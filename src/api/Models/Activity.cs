namespace CRMPlus.Api.Models;

public enum ActivityType { Note, Email, Call, Meeting }

public class Activity
{
    public int Id { get; set; }
    public ActivityType Type { get; set; }
    public string Subject { get; set; } = "";
    public string? Body { get; set; }
    public int? AccountId { get; set; }
    public Account? Account { get; set; }
    public int? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
