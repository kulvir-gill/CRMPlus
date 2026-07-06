using CRMPlus.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<QuoteLineItem> QuoteLineItems => Set<QuoteLineItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLineItem> InvoiceLineItems => Set<InvoiceLineItem>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Team → Manager (self-reference)
        modelBuilder.Entity<Team>()
            .HasOne(t => t.Manager)
            .WithMany()
            .HasForeignKey(t => t.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        // User → Team
        modelBuilder.Entity<User>()
            .HasOne(u => u.Team)
            .WithMany(t => t.Members)
            .HasForeignKey(u => u.TeamId)
            .OnDelete(DeleteBehavior.SetNull);

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
            .OnDelete(DeleteBehavior.Cascade);

        // WorkItem → AssignedUser
        modelBuilder.Entity<WorkItem>()
            .HasOne(w => w.AssignedUser)
            .WithMany(u => u.AssignedWorkItems)
            .HasForeignKey(w => w.AssignedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Activity → User
        modelBuilder.Entity<Activity>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Decimal precision
        foreach (var entity in new[] { typeof(Quote), typeof(Invoice) })
        {
            modelBuilder.Entity(entity).Property("Subtotal").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("Tax").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("Total").HasColumnType("decimal(18,2)");
            modelBuilder.Entity(entity).Property("TaxRate").HasColumnType("decimal(5,2)");
        }

        modelBuilder.Entity<QuoteLineItem>().Property(q => q.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<QuoteLineItem>().Property(q => q.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuoteLineItem>().Property(q => q.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.Quantity).HasColumnType("decimal(18,4)");
        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<InvoiceLineItem>().Property(i => i.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Product>().Property(p => p.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<WorkItem>().Property(w => w.EstimatedHours).HasColumnType("decimal(8,2)");
        modelBuilder.Entity<WorkItem>().Property(w => w.ActualHours).HasColumnType("decimal(8,2)");
        modelBuilder.Entity<TimesheetEntry>().Property(e => e.Hours).HasColumnType("decimal(8,2)");

        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
    }
}
