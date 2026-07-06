namespace CRMPlus.Api.Models;

public class Contact
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public int? AccountId { get; set; }
    public Account? Account { get; set; }
    public bool AuditEnabled { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Activity> Activities { get; set; } = [];
}
