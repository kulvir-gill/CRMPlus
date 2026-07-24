namespace CRMPlus.Api.Models;

public enum ActivityType { Note, Email }
public enum EmailDirection { Sent, Received }

public class Activity
{
    public Guid Id { get; set; }
    public ActivityType Type { get; set; }
    public EmailDirection? Direction { get; set; }
    public string Subject { get; set; } = "";
    public string? Body { get; set; }
    public Guid? AccountId { get; set; }
    public Account? Account { get; set; }
    public Guid? ContactId { get; set; }
    public Contact? Contact { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
