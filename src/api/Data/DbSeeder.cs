using CRMPlus.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        var adminRole = await db.SecurityRoles.FirstAsync(r => r.Name == "Admin");

        var adminUser = new User
        {
            FirstName = "Admin",
            LastName = "User",
            Email = "admin@crmplus.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            SecurityRoles = [adminRole],
            IsActive = true,
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        var team = new Team { Name = "Sales Team", ManagerId = adminUser.Id };
        db.Teams.Add(team);

        var product1 = new Product { Name = "Consulting (hourly)", Price = 150, Unit = "hour", Description = "Professional consulting services" };
        var product2 = new Product { Name = "Software License", Price = 999, Unit = "seat", Description = "Annual software license" };
        db.Products.AddRange(product1, product2);

        await db.SaveChangesAsync();
    }
}
