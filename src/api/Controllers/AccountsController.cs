using System.Security.Claims;
using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Accounts
            .Include(a => a.Contacts)
            .Include(a => a.Activities)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.Name.Contains(search) || (a.Email != null && a.Email.Contains(search)));

        var accounts = await query
            .OrderBy(a => a.Name)
            .Select(a => new AccountResponse(a.Id, a.Name, a.Phone, a.Email, a.Website, a.Address, a.Industry,
                a.AuditEnabled, a.CreatedAt, a.Contacts.Count, a.Activities.Count))
            .ToListAsync();

        return Ok(accounts);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var a = await db.Accounts
            .Include(a => a.Contacts)
            .Include(a => a.Activities)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (a is null) return NotFound();

        return Ok(new AccountResponse(a.Id, a.Name, a.Phone, a.Email, a.Website, a.Address, a.Industry,
            a.AuditEnabled, a.CreatedAt, a.Contacts.Count, a.Activities.Count));
    }

    [HttpPost]
    public async Task<IActionResult> Create(AccountRequest req)
    {
        var account = new Account
        {
            Name = req.Name, Phone = req.Phone, Email = req.Email,
            Website = req.Website, Address = req.Address, Industry = req.Industry,
            AuditEnabled = req.AuditEnabled,
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        await WriteAudit("Account", account.Id, AuditAction.Created, null, account);
        return CreatedAtAction(nameof(GetById), new { id = account.Id },
            new AccountResponse(account.Id, account.Name, account.Phone, account.Email, account.Website,
                account.Address, account.Industry, account.AuditEnabled, account.CreatedAt, 0, 0));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, AccountRequest req)
    {
        var account = await db.Accounts.FindAsync(id);
        if (account is null) return NotFound();

        var old = new { account.Name, account.Phone, account.Email };
        account.Name = req.Name; account.Phone = req.Phone; account.Email = req.Email;
        account.Website = req.Website; account.Address = req.Address; account.Industry = req.Industry;
        account.AuditEnabled = req.AuditEnabled; account.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        if (account.AuditEnabled) await WriteAudit("Account", account.Id, AuditAction.Updated, old, req);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var account = await db.Accounts.FindAsync(id);
        if (account is null) return NotFound();
        db.Accounts.Remove(account);
        await db.SaveChangesAsync();
        await WriteAudit("Account", id, AuditAction.Deleted, account, null);
        return NoContent();
    }

    private async Task WriteAudit(string entity, int entityId, AuditAction action, object? oldVal, object? newVal)
    {
        var userId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (int?)null;
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = entity, EntityId = entityId, Action = action,
            UserId = userId, UserEmail = User.FindFirstValue(ClaimTypes.Email),
            OldValues = oldVal is null ? null : System.Text.Json.JsonSerializer.Serialize(oldVal),
            NewValues = newVal is null ? null : System.Text.Json.JsonSerializer.Serialize(newVal),
        });
        await db.SaveChangesAsync();
    }
}
