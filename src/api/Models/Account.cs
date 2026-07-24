namespace CRMPlus.Api.Models;

public class Account
{
    public Guid Id { get; set; }
    public string AccountNumber { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public decimal TaxRate { get; set; } = 0;
    public bool AuditEnabled { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? PrimaryContactId { get; set; }
    public Contact? PrimaryContact { get; set; }
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? OwnerTeamId { get; set; }
    public Team? OwnerTeam { get; set; }
    public Guid? PrimaryAddressId { get; set; }
    public Address? PrimaryAddress { get; set; }
    public ICollection<Address> Addresses { get; set; } = [];
    public ICollection<Contact> Contacts { get; set; } = [];
    public ICollection<Activity> Activities { get; set; } = [];
    public ICollection<Quote> Quotes { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
}
