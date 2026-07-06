namespace CRMPlus.Api.Models;

public class Account
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? Address { get; set; }
    public string? Industry { get; set; }
    public bool AuditEnabled { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Contact> Contacts { get; set; } = [];
    public ICollection<Activity> Activities { get; set; } = [];
    public ICollection<Quote> Quotes { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
}
