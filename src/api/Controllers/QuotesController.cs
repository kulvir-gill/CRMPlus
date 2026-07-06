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
public class QuotesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? accountId)
    {
        var query = db.Quotes
            .Include(q => q.Account).Include(q => q.Contact)
            .Include(q => q.LineItems).ThenInclude(li => li.Product)
            .AsQueryable();

        if (accountId.HasValue) query = query.Where(q => q.AccountId == accountId);

        return Ok(await query.OrderByDescending(q => q.CreatedAt).Select(q => ToResponse(q)).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var q = await db.Quotes.Include(q => q.Account).Include(q => q.Contact)
            .Include(q => q.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (q is null) return NotFound();
        return Ok(ToResponse(q));
    }

    [HttpPost]
    public async Task<IActionResult> Create(QuoteRequest req)
    {
        var count = await db.Quotes.CountAsync() + 1;
        var quote = new Quote
        {
            QuoteNumber = $"QT-{count:D5}",
            AccountId = req.AccountId, ContactId = req.ContactId, Status = req.Status,
            ValidUntil = req.ValidUntil, Notes = req.Notes, TaxRate = req.TaxRate,
            LineItems = req.LineItems.Select(li => new QuoteLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Total = li.Quantity * li.UnitPrice
            }).ToList()
        };
        RecalcTotals(quote);
        db.Quotes.Add(quote);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = quote.Id }, new { quote.Id, quote.QuoteNumber });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, QuoteRequest req)
    {
        var quote = await db.Quotes.Include(q => q.LineItems).FirstOrDefaultAsync(q => q.Id == id);
        if (quote is null) return NotFound();

        quote.AccountId = req.AccountId; quote.ContactId = req.ContactId; quote.Status = req.Status;
        quote.ValidUntil = req.ValidUntil; quote.Notes = req.Notes; quote.TaxRate = req.TaxRate;
        quote.UpdatedAt = DateTime.UtcNow;
        quote.LineItems = req.LineItems.Select(li => new QuoteLineItem
        {
            QuoteId = id, ProductId = li.ProductId, Description = li.Description,
            Quantity = li.Quantity, UnitPrice = li.UnitPrice, Total = li.Quantity * li.UnitPrice
        }).ToList();
        RecalcTotals(quote);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        db.Quotes.Remove(quote);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void RecalcTotals(Quote q)
    {
        q.Subtotal = q.LineItems.Sum(li => li.Total);
        q.Tax = q.Subtotal * q.TaxRate / 100;
        q.Total = q.Subtotal + q.Tax;
    }

    private static QuoteResponse ToResponse(Quote q) => new(
        q.Id, q.QuoteNumber, q.AccountId, q.Account!.Name,
        q.ContactId, q.Contact != null ? q.Contact.FirstName + " " + q.Contact.LastName : null,
        q.Status.ToString(), q.ValidUntil, q.Notes, q.TaxRate, q.Subtotal, q.Tax, q.Total, q.CreatedAt,
        q.LineItems.Select(li => new QuoteLineItemResponse(li.Id, li.ProductId, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Total)).ToList());
}
