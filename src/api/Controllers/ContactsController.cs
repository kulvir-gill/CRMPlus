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
public class ContactsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int? accountId)
    {
        var query = db.Contacts.Include(c => c.Account).AsQueryable();

        if (accountId.HasValue) query = query.Where(c => c.AccountId == accountId);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.FirstName.Contains(search) || c.LastName.Contains(search) || (c.Email != null && c.Email.Contains(search)));

        var contacts = await query.OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
            .Select(c => new ContactResponse(c.Id, c.FirstName, c.LastName, c.Email, c.Phone, c.Title,
                c.AccountId, c.Account != null ? c.Account.Name : null, c.AuditEnabled, c.CreatedAt))
            .ToListAsync();

        return Ok(contacts);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var c = await db.Contacts.Include(c => c.Account).FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return NotFound();
        return Ok(new ContactResponse(c.Id, c.FirstName, c.LastName, c.Email, c.Phone, c.Title,
            c.AccountId, c.Account?.Name, c.AuditEnabled, c.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ContactRequest req)
    {
        var contact = new Contact
        {
            FirstName = req.FirstName, LastName = req.LastName, Email = req.Email,
            Phone = req.Phone, Title = req.Title, AccountId = req.AccountId, AuditEnabled = req.AuditEnabled,
        };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = contact.Id },
            new ContactResponse(contact.Id, contact.FirstName, contact.LastName, contact.Email,
                contact.Phone, contact.Title, contact.AccountId, null, contact.AuditEnabled, contact.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ContactRequest req)
    {
        var contact = await db.Contacts.FindAsync(id);
        if (contact is null) return NotFound();

        contact.FirstName = req.FirstName; contact.LastName = req.LastName; contact.Email = req.Email;
        contact.Phone = req.Phone; contact.Title = req.Title; contact.AccountId = req.AccountId;
        contact.AuditEnabled = req.AuditEnabled; contact.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var contact = await db.Contacts.FindAsync(id);
        if (contact is null) return NotFound();
        db.Contacts.Remove(contact);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
