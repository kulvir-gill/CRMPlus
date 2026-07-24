using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using CRMPlus.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Authorize(Policy = "Module:sales")]
public class QuotesController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership, QuoteDocumentService documentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? accountId, [FromQuery] string? search, [FromQuery] bool? isActive, [FromQuery] string? status,
        [FromQuery] string sortField = "createdat", [FromQuery] string sortDir = "desc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Quotes
            .Include(q => q.Account).Include(q => q.Contact).Include(q => q.Owner).Include(q => q.OwnerTeam).Include(q => q.QuoteTemplate)
            .Include(q => q.LineItems).ThenInclude(li => li.Product)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(q =>
                (q.OwnerId != null && visibleOwnerIds.Contains(q.OwnerId.Value)) ||
                (q.OwnerTeamId != null && userTeamIds.Contains(q.OwnerTeamId.Value)));
        }

        if (accountId.HasValue) query = query.Where(q => q.AccountId == accountId);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(q => q.QuoteNumber.Contains(search) || q.Account!.Name.Contains(search));
        if (isActive.HasValue)
            query = query.Where(q => q.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<QuoteStatus>(status, true, out var statusFilter))
            query = query.Where(q => q.Status == statusFilter);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var quotes = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var quoteIds = quotes.Select(q => q.Id).ToList();
        var orderMap = await db.Orders
            .Where(o => o.QuoteId != null && quoteIds.Contains(o.QuoteId.Value))
            .Select(o => new { o.QuoteId, o.Id, o.OrderNumber })
            .ToDictionaryAsync(o => o.QuoteId!.Value, o => (o.Id, o.OrderNumber));

        return Ok(new QuoteListResponse(quotes.Select(q =>
        {
            var order = orderMap.GetValueOrDefault(q.Id);
            return ToResponse(q, order.Id == Guid.Empty ? null : order.Id, order.OrderNumber);
        }).ToList(), totalCount));
    }

    private static IQueryable<Quote> ApplySort(IQueryable<Quote> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "quotenumber" => desc ? query.OrderByDescending(q => q.QuoteNumber) : query.OrderBy(q => q.QuoteNumber),
            "account" => desc ? query.OrderByDescending(q => q.Account!.Name) : query.OrderBy(q => q.Account!.Name),
            "status" => desc ? query.OrderByDescending(q => q.Status) : query.OrderBy(q => q.Status),
            "total" => desc ? query.OrderByDescending(q => q.Total) : query.OrderBy(q => q.Total),
            "validuntil" => desc ? query.OrderByDescending(q => q.ValidUntil) : query.OrderBy(q => q.ValidUntil),
            _ => desc ? query.OrderByDescending(q => q.CreatedAt) : query.OrderBy(q => q.CreatedAt),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var q = await db.Quotes.Include(q => q.Account).ThenInclude(a => a!.PrimaryAddress)
            .Include(q => q.Contact).Include(q => q.Owner).Include(q => q.OwnerTeam).Include(q => q.QuoteTemplate)
            .Include(q => q.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (q is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, q.OwnerId, q.OwnerTeamId))
            return NotFound();

        var order = await db.Orders.Where(o => o.QuoteId == q.Id)
            .Select(o => new { o.Id, o.OrderNumber })
            .FirstOrDefaultAsync();

        return Ok(ToResponse(q, order?.Id, order?.OrderNumber));
    }

    [HttpPost]
    public async Task<IActionResult> Create(QuoteRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A quote can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var count = await db.Quotes.CountAsync() + 1;
        var validityDays = await GetDefaultValidityDaysAsync();
        var quote = new Quote
        {
            QuoteNumber = $"QT-{count:D5}",
            AccountId = req.AccountId, ContactId = req.ContactId, Status = QuoteStatus.Draft, IsActive = req.IsActive,
            ValidUntil = DateTime.UtcNow.Date.AddDays(validityDays), Notes = req.Notes, TaxRate = req.TaxRate, Discount = req.Discount,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId, QuoteTemplateId = req.QuoteTemplateId,
            LineItems = req.LineItems.Select(li => new QuoteLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount, Total = CalcLineTotal(li)
            }).ToList()
        };
        RecalcTotals(quote);
        db.Quotes.Add(quote);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = quote.Id }, new { quote.Id, quote.QuoteNumber });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, QuoteRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A quote can be owned by a user or a team, not both." });

        var quote = await db.Quotes.Include(q => q.LineItems).FirstOrDefaultAsync(q => q.Id == id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();

        quote.AccountId = req.AccountId; quote.ContactId = req.ContactId;
        quote.IsActive = req.IsActive;
        quote.Notes = req.Notes; quote.TaxRate = req.TaxRate;
        quote.Discount = req.Discount;
        quote.OwnerId = req.OwnerId; quote.OwnerTeamId = req.OwnerTeamId;
        quote.UpdatedAt = DateTime.UtcNow;
        quote.LineItems = req.LineItems.Select(li => new QuoteLineItem
        {
            QuoteId = id, ProductId = li.ProductId, Description = li.Description,
            Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount, Total = CalcLineTotal(li)
        }).ToList();
        RecalcTotals(quote);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/activate")]
    public async Task<IActionResult> Activate(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status != QuoteStatus.Draft)
            return BadRequest(new { message = "Only draft quotes can be activated." });

        quote.Status = QuoteStatus.Active;
        quote.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/revise")]
    public async Task<IActionResult> Revise(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status != QuoteStatus.Active)
            return BadRequest(new { message = "Only active quotes can be revised." });

        quote.Status = QuoteStatus.Draft;
        quote.Version += 1;
        quote.ValidUntil = DateTime.UtcNow.Date.AddDays(await GetDefaultValidityDaysAsync());
        quote.DocumentGeneratedAt = null;
        quote.SentToCustomerAt = null;
        quote.ApprovedAt = null;
        quote.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/mark-sent")]
    public async Task<IActionResult> MarkSent(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status != QuoteStatus.Active)
            return BadRequest(new { message = "Only active quotes can be marked as sent." });
        if (quote.DocumentGeneratedAt is null)
            return BadRequest(new { message = "Generate the quote document before marking it as sent." });

        quote.SentToCustomerAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/mark-approved")]
    public async Task<IActionResult> MarkApproved(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status != QuoteStatus.Active)
            return BadRequest(new { message = "Only active quotes can be marked as confirmed." });
        if (quote.SentToCustomerAt is null)
            return BadRequest(new { message = "Mark the quote as sent to the customer before confirming it." });

        quote.ApprovedAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.Include(q => q.LineItems).FirstOrDefaultAsync(q => q.Id == id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status != QuoteStatus.Active)
            return BadRequest(new { message = "Only active quotes can be submitted." });
        if (quote.ApprovedAt is null)
            return BadRequest(new { message = "Mark the quote as confirmed before submitting the order." });

        quote.Status = QuoteStatus.Won;
        quote.UpdatedAt = DateTime.UtcNow;

        var order = new Order
        {
            OrderNumber = await GenerateOrderNumberAsync(),
            QuoteId = quote.Id,
            AccountId = quote.AccountId, ContactId = quote.ContactId, IsActive = true,
            Notes = quote.Notes, TaxRate = quote.TaxRate, Discount = quote.Discount,
            OwnerId = quote.OwnerId, OwnerTeamId = quote.OwnerTeamId,
            LineItems = quote.LineItems.Select(li => new OrderLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount, Total = li.Total
            }).ToList()
        };
        order.Subtotal = quote.Subtotal;
        order.Tax = quote.Tax;
        order.Total = quote.Total;
        db.Orders.Add(order);

        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var count = await db.Orders.CountAsync() + 1;
        return $"SO-{count:D5}";
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();
        if (quote.Status is QuoteStatus.Won or QuoteStatus.Cancelled)
            return BadRequest(new { message = "Quote is already closed." });

        quote.Status = QuoteStatus.Cancelled;
        quote.IsActive = false;
        quote.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/document")]
    public async Task<IActionResult> GenerateDocument(Guid id)
    {
        var q = await db.Quotes.Include(q => q.Account).ThenInclude(a => a!.PrimaryAddress)
            .Include(q => q.Owner).Include(q => q.OwnerTeam)
            .Include(q => q.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (q is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, q.OwnerId, q.OwnerTeamId))
            return NotFound();

        var pdfBytes = await documentService.GenerateQuotePdfAsync(q);

        var settings = await db.QuoteSettings.FirstOrDefaultAsync();
        if (!string.IsNullOrWhiteSpace(settings?.DocumentLocation))
        {
            try
            {
                var folder = Path.Combine(settings.DocumentLocation, q.Account!.AccountNumber, "quote");
                Directory.CreateDirectory(folder);
                await System.IO.File.WriteAllBytesAsync(Path.Combine(folder, $"{q.QuoteNumber}-{q.Version}.pdf"), pdfBytes);
            }
            catch
            {
                // Document storage is a best-effort convenience; the generated PDF is still returned either way.
            }
        }

        q.DocumentGeneratedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return File(pdfBytes, "application/pdf", $"{q.QuoteNumber}-{q.Version}.pdf");
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No quotes selected." });

        var idQuery = db.Quotes.Where(q => req.Ids.Contains(q.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(q =>
                q.OwnerId == currentUser.UserId ||
                (q.OwnerTeamId != null && userTeamIds.Contains(q.OwnerTeamId.Value)));
        }
        var quotes = await idQuery.ToListAsync();
        foreach (var quote in quotes)
        {
            quote.IsActive = req.IsActive;
            quote.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = quotes.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var quote = await db.Quotes.FindAsync(id);
        if (quote is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, quote.OwnerId, quote.OwnerTeamId)) return Forbid();

        db.Quotes.Remove(quote);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<int> GetDefaultValidityDaysAsync()
    {
        var settings = await db.QuoteSettings.FirstOrDefaultAsync();
        return settings?.DefaultValidityDays ?? 30;
    }

    private static decimal CalcLineTotal(QuoteLineItemRequest li) => li.Quantity * li.UnitPrice * (1 - li.Discount / 100);

    private static void RecalcTotals(Quote q)
    {
        q.Subtotal = q.LineItems.Sum(li => li.Total);
        var discounted = q.Subtotal - q.Discount;
        q.Tax = discounted * q.TaxRate / 100;
        q.Total = discounted + q.Tax;
    }

    private static QuoteResponse ToResponse(Quote q, Guid? orderId = null, string? orderNumber = null) => new(
        q.Id, q.QuoteNumber, q.AccountId, q.Account!.Name, q.Account.Phone, q.Account.Email,
        q.Account.PrimaryAddress is null ? null : new AddressDto(
            q.Account.PrimaryAddress.AddressLine1, q.Account.PrimaryAddress.AddressLine2, q.Account.PrimaryAddress.AddressLine3,
            q.Account.PrimaryAddress.County, q.Account.PrimaryAddress.Province, q.Account.PrimaryAddress.Country, q.Account.PrimaryAddress.PostalCode),
        q.ContactId, q.Contact != null ? q.Contact.FirstName + " " + q.Contact.LastName : null,
        q.Status.ToString(), q.Version, q.IsActive, q.ValidUntil, q.Notes, q.TaxRate, q.Discount, q.Subtotal, q.Tax, q.Total, q.CreatedAt, q.DocumentGeneratedAt,
        q.SentToCustomerAt, q.ApprovedAt, q.QuoteTemplateId, q.QuoteTemplate?.Name, orderId, orderNumber,
        q.LineItems.Select(li => new QuoteLineItemResponse(li.Id, li.ProductId, li.Product?.ProductNumber, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Discount, li.Total)).ToList(),
        q.OwnerId, q.Owner is not null ? $"{q.Owner.FirstName} {q.Owner.LastName}" : null,
        q.OwnerTeamId, q.OwnerTeam?.Name);
}
