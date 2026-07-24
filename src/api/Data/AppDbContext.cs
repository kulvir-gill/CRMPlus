using CRMPlus.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<SecurityRole> SecurityRoles => Set<SecurityRole>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<QuoteLineItem> QuoteLineItems => Set<QuoteLineItem>();
    public DbSet<QuoteSettings> QuoteSettings => Set<QuoteSettings>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLineItem> OrderLineItems => Set<OrderLineItem>();
    public DbSet<QuoteTemplate> QuoteTemplates => Set<QuoteTemplate>();
    public DbSet<QuoteTemplateLineItem> QuoteTemplateLineItems => Set<QuoteTemplateLineItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLineItem> InvoiceLineItems => Set<InvoiceLineItem>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AuditLogChange> AuditLogChanges => Set<AuditLogChange>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Team → Manager (self-reference)
        modelBuilder.Entity<Team>()
            .HasOne(t => t.Manager)
            .WithMany()
            .HasForeignKey(t => t.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        // User ↔ Team (many-to-many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.Teams)
            .WithMany(t => t.Members)
            .UsingEntity<Dictionary<string, object>>(
                "UserTeam",
                j => j.HasOne<Team>().WithMany().HasForeignKey("TeamId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasOne<User>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
                j => j.ToTable("UserTeams"));

        // User → Manager (self-reference)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Manager)
            .WithMany()
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        // User ↔ SecurityRole (direct assignment, many-to-many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.SecurityRoles)
            .WithMany(r => r.Users)
            .UsingEntity<Dictionary<string, object>>(
                "UserSecurityRole",
                j => j.HasOne<SecurityRole>().WithMany().HasForeignKey("SecurityRoleId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasOne<User>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
                j => j.ToTable("UserSecurityRoles"));

        // Team ↔ SecurityRole (inherited by members, many-to-many)
        modelBuilder.Entity<Team>()
            .HasMany(t => t.SecurityRoles)
            .WithMany(r => r.Teams)
            .UsingEntity<Dictionary<string, object>>(
                "TeamSecurityRole",
                j => j.HasOne<SecurityRole>().WithMany().HasForeignKey("SecurityRoleId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasOne<Team>().WithMany().HasForeignKey("TeamId").OnDelete(DeleteBehavior.Cascade),
                j => j.ToTable("TeamSecurityRoles"));

        modelBuilder.Entity<SecurityRole>().HasIndex(r => r.Name).IsUnique();

        // Timesheet → Approver
        modelBuilder.Entity<Timesheet>()
            .HasOne(t => t.Approver)
            .WithMany()
            .HasForeignKey(t => t.ApproverId)
            .OnDelete(DeleteBehavior.SetNull);

        // Timesheet → User
        modelBuilder.Entity<Timesheet>()
            .HasOne(t => t.User)
            .WithMany(u => u.Timesheets)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // WorkItem → AssignedUser
        modelBuilder.Entity<WorkItem>()
            .HasOne(w => w.AssignedUser)
            .WithMany(u => u.AssignedWorkItems)
            .HasForeignKey(w => w.AssignedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // WorkItem → AssignedTeam
        modelBuilder.Entity<WorkItem>()
            .HasOne(w => w.AssignedTeam)
            .WithMany()
            .HasForeignKey(w => w.AssignedTeamId)
            .OnDelete(DeleteBehavior.SetNull);

        // Activity → User
        modelBuilder.Entity<Activity>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Account → Primary Contact
        modelBuilder.Entity<Account>()
            .HasOne(a => a.PrimaryContact)
            .WithMany()
            .HasForeignKey(a => a.PrimaryContactId)
            .OnDelete(DeleteBehavior.SetNull);

        // Account → Primary Address
        modelBuilder.Entity<Account>()
            .HasOne(a => a.PrimaryAddress)
            .WithMany()
            .HasForeignKey(a => a.PrimaryAddressId)
            .OnDelete(DeleteBehavior.SetNull);

        // Account → Owner
        modelBuilder.Entity<Account>()
            .HasOne(a => a.Owner)
            .WithMany()
            .HasForeignKey(a => a.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Contact → Owner
        modelBuilder.Entity<Contact>()
            .HasOne(c => c.Owner)
            .WithMany()
            .HasForeignKey(c => c.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Quote → Owner
        modelBuilder.Entity<Quote>()
            .HasOne(q => q.Owner)
            .WithMany()
            .HasForeignKey(q => q.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Invoice → Owner
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Owner)
            .WithMany()
            .HasForeignKey(i => i.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Order → Owner
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Owner)
            .WithMany()
            .HasForeignKey(o => o.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Order → Quote (the quote it was generated from, if any)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Quote)
            .WithMany()
            .HasForeignKey(o => o.QuoteId)
            .OnDelete(DeleteBehavior.SetNull);

        // Order → Account (avoids a second cascade path to Account via Quote → Account)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Account)
            .WithMany()
            .HasForeignKey(o => o.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Invoice → Order (the order it was generated from, if any)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Order)
            .WithMany()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.SetNull);

        // QuoteTemplate → Account (Restrict avoids a second cascade path to Account via Quote → QuoteTemplate)
        modelBuilder.Entity<QuoteTemplate>()
            .HasOne(t => t.Account)
            .WithMany()
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Quote → QuoteTemplate (the template it was quick-created from, if any)
        modelBuilder.Entity<Quote>()
            .HasOne(q => q.QuoteTemplate)
            .WithMany()
            .HasForeignKey(q => q.QuoteTemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        // Product → Owner
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Owner)
            .WithMany()
            .HasForeignKey(p => p.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Product → Vendor
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Vendor)
            .WithMany(v => v.Products)
            .HasForeignKey(p => p.VendorId)
            .OnDelete(DeleteBehavior.SetNull);

        // Vendor → Owner
        modelBuilder.Entity<Vendor>()
            .HasOne(v => v.Owner)
            .WithMany()
            .HasForeignKey(v => v.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Vendor>().HasOne(v => v.OwnerTeam).WithMany().HasForeignKey(v => v.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);

        // Purchase → Product (parent, cascade - a purchase record can't exist without its product)
        modelBuilder.Entity<Purchase>()
            .HasOne(p => p.Product)
            .WithMany()
            .HasForeignKey(p => p.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Purchase → Vendor
        modelBuilder.Entity<Purchase>()
            .HasOne(p => p.Vendor)
            .WithMany()
            .HasForeignKey(p => p.VendorId)
            .OnDelete(DeleteBehavior.SetNull);

        // Purchase → Owner
        modelBuilder.Entity<Purchase>().HasOne(p => p.Owner).WithMany().HasForeignKey(p => p.OwnerId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Purchase>().HasOne(p => p.OwnerTeam).WithMany().HasForeignKey(p => p.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);

        // Project → Owner
        modelBuilder.Entity<Project>()
            .HasOne(p => p.Owner)
            .WithMany()
            .HasForeignKey(p => p.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // → OwnerTeam (Account, Contact, Quote, Invoice, Order, Product, Project)
        modelBuilder.Entity<Account>().HasOne(a => a.OwnerTeam).WithMany().HasForeignKey(a => a.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Contact>().HasOne(c => c.OwnerTeam).WithMany().HasForeignKey(c => c.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Quote>().HasOne(q => q.OwnerTeam).WithMany().HasForeignKey(q => q.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Invoice>().HasOne(i => i.OwnerTeam).WithMany().HasForeignKey(i => i.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Order>().HasOne(o => o.OwnerTeam).WithMany().HasForeignKey(o => o.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Product>().HasOne(p => p.OwnerTeam).WithMany().HasForeignKey(p => p.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Project>().HasOne(p => p.OwnerTeam).WithMany().HasForeignKey(p => p.OwnerTeamId).OnDelete(DeleteBehavior.SetNull);

        // AuditLog → Changes (field-level diffs per transaction)
        modelBuilder.Entity<AuditLog>()
            .HasMany(a => a.Changes)
            .WithOne(c => c.AuditLog)
            .HasForeignKey(c => c.AuditLogId)
            .OnDelete(DeleteBehavior.Cascade);

        // Account → Addresses (additional, typed addresses)
        modelBuilder.Entity<Address>()
            .HasOne(a => a.Account)
            .WithMany(acc => acc.Addresses)
            .HasForeignKey(a => a.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Decimal precision
        foreach (var entity in new[] { typeof(Quote), typeof(Invoice), typeof(Order) })
        {
            modelBuilder.Entity(entity).Property("Subtotal").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("Tax").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("Total").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("TaxRate").HasColumnType("decimal(5,2)");
        }
        modelBuilder.Entity<Order>().Property(o => o.Discount).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<QuoteLineItem>().Property(q => q.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<QuoteLineItem>().Property(q => q.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuoteLineItem>().Property(q => q.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<OrderLineItem>().Property(o => o.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<OrderLineItem>().Property(o => o.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<OrderLineItem>().Property(o => o.Discount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<OrderLineItem>().Property(o => o.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<QuoteTemplate>().Property(t => t.TaxRate).HasColumnType("decimal(5,2)");
        modelBuilder.Entity<QuoteTemplate>().Property(t => t.Discount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuoteTemplateLineItem>().Property(t => t.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<QuoteTemplateLineItem>().Property(t => t.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuoteTemplateLineItem>().Property(t => t.Discount).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<SecurityRole>().Property(r => r.AccessLevel).HasDefaultValue(ModuleAccessLevel.Full);
        modelBuilder.Entity<Contact>().Property(c => c.IsActive).HasDefaultValue(true);
        modelBuilder.Entity<Product>().Property(p => p.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Purchase>().Property(p => p.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Purchase>().Property(p => p.Quantity).HasColumnType("decimal(18,4)").HasDefaultValue(1m);
        modelBuilder.Entity<Quote>().Property(q => q.Version).HasDefaultValue(1);
        modelBuilder.Entity<WorkItem>().Property(w => w.EstimatedHours).HasColumnType("decimal(8,2)");
        modelBuilder.Entity<WorkItem>().Property(w => w.ActualHours).HasColumnType("decimal(8,2)");
        modelBuilder.Entity<TimesheetEntry>().Property(e => e.Hours).HasColumnType("decimal(8,2)");

        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Account>().Property(a => a.AccountNumber).HasMaxLength(4).HasDefaultValue("0000");
        modelBuilder.Entity<Account>().HasIndex(a => a.AccountNumber).IsUnique();
    }
}
