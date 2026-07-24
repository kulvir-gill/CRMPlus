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
public class OrdersController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? accountId, [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "createdat", [FromQuery] string sortDir = "desc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Orders
            .Include(o => o.Account).Include(o => o.Contact).Include(o => o.Owner).Include(o => o.OwnerTeam).Include(o => o.Quote)
            .Include(o => o.LineItems).ThenInclude(li => li.Product)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(o =>
                (o.OwnerId != null && visibleOwnerIds.Contains(o.OwnerId.Value)) ||
                (o.OwnerTeamId != null && userTeamIds.Contains(o.OwnerTeamId.Value)));
        }

        if (accountId.HasValue) query = query.Where(o => o.AccountId == accountId);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o => o.OrderNumber.Contains(search) || o.Account!.Name.Contains(search));
        if (isActive.HasValue)
            query = query.Where(o => o.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var orders = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var orderIds = orders.Select(o => o.Id).ToList();
        var invoiceMap = await db.Invoices
            .Where(i => i.OrderId != null && orderIds.Contains(i.OrderId.Value))
            .Select(i => new { i.OrderId, i.Id, i.InvoiceNumber })
            .ToDictionaryAsync(i => i.OrderId!.Value, i => (i.Id, i.InvoiceNumber));

        return Ok(new OrderListResponse(orders.Select(o =>
        {
            var invoice = invoiceMap.GetValueOrDefault(o.Id);
            return ToResponse(o, invoice.Id == Guid.Empty ? null : invoice.Id, invoice.InvoiceNumber);
        }).ToList(), totalCount));
    }

    private static IQueryable<Order> ApplySort(IQueryable<Order> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "ordernumber" => desc ? query.OrderByDescending(o => o.OrderNumber) : query.OrderBy(o => o.OrderNumber),
            "account" => desc ? query.OrderByDescending(o => o.Account!.Name) : query.OrderBy(o => o.Account!.Name),
            "total" => desc ? query.OrderByDescending(o => o.Total) : query.OrderBy(o => o.Total),
            _ => desc ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var o = await db.Orders.Include(o => o.Account).ThenInclude(a => a!.PrimaryAddress)
            .Include(o => o.Contact).Include(o => o.Owner).Include(o => o.OwnerTeam).Include(o => o.Quote)
            .Include(o => o.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (o is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, o.OwnerId, o.OwnerTeamId))
            return NotFound();

        var invoice = await db.Invoices.Where(i => i.OrderId == o.Id)
            .Select(i => new { i.Id, i.InvoiceNumber })
            .FirstOrDefaultAsync();

        return Ok(ToResponse(o, invoice?.Id, invoice?.InvoiceNumber));
    }

    [HttpPost]
    public async Task<IActionResult> Create(OrderRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An order can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var orderNumber = await GenerateOrderNumberAsync();
        var order = new Order
        {
            OrderNumber = orderNumber,
            AccountId = req.AccountId, ContactId = req.ContactId, IsActive = req.IsActive,
            Notes = req.Notes, TaxRate = req.TaxRate, Discount = req.Discount,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
            LineItems = req.LineItems.Select(li => new OrderLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount, Total = CalcLineTotal(li),
                QuantityFulfilled = Math.Clamp(li.QuantityFulfilled, 0, li.Quantity)
            }).ToList()
        };
        RecalcTotals(order);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, new { order.Id, order.OrderNumber });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, OrderRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An order can be owned by a user or a team, not both." });

        var order = await db.Orders.Include(o => o.LineItems).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, order.OwnerId, order.OwnerTeamId)) return Forbid();

        order.AccountId = req.AccountId; order.ContactId = req.ContactId;
        order.IsActive = req.IsActive;
        order.Notes = req.Notes; order.TaxRate = req.TaxRate;
        order.Discount = req.Discount;
        order.OwnerId = req.OwnerId; order.OwnerTeamId = req.OwnerTeamId;
        order.UpdatedAt = DateTime.UtcNow;
        order.LineItems = req.LineItems.Select(li => new OrderLineItem
        {
            OrderId = id, ProductId = li.ProductId, Description = li.Description,
            Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount, Total = CalcLineTotal(li),
            QuantityFulfilled = Math.Clamp(li.QuantityFulfilled, 0, li.Quantity)
        }).ToList();
        RecalcTotals(order);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No orders selected." });

        var idQuery = db.Orders.Where(o => req.Ids.Contains(o.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(o =>
                o.OwnerId == currentUser.UserId ||
                (o.OwnerTeamId != null && userTeamIds.Contains(o.OwnerTeamId.Value)));
        }
        var orders = await idQuery.ToListAsync();
        foreach (var order in orders)
        {
            order.IsActive = req.IsActive;
            order.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = orders.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, order.OwnerId, order.OwnerTeamId)) return Forbid();

        db.Orders.Remove(order);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/fulfillment-stage")]
    public async Task<IActionResult> SetFulfillmentStage(Guid id, SetFulfillmentStageRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (!Enum.TryParse<FulfillmentStage>(req.Stage, true, out var stage))
            return BadRequest(new { message = "Invalid fulfillment stage." });

        if (stage == FulfillmentStage.PartialFulfilled)
            return BadRequest(new { message = "Partial Fulfilled is set automatically based on line item quantities and can't be selected manually." });

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, order.OwnerId, order.OwnerTeamId)) return Forbid();
        if (stage <= order.FulfillmentStage)
            return BadRequest(new { message = "Fulfillment stage can only move forward." });

        order.FulfillmentStage = stage;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/lines/{lineId}/quantity-fulfilled")]
    public async Task<IActionResult> SetQuantityFulfilled(Guid id, Guid lineId, SetQuantityFulfilledRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var order = await db.Orders.Include(o => o.LineItems).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, order.OwnerId, order.OwnerTeamId)) return Forbid();

        var line = order.LineItems.FirstOrDefault(li => li.Id == lineId);
        if (line is null) return NotFound();
        if (req.QuantityFulfilled < 0 || req.QuantityFulfilled > line.Quantity)
            return BadRequest(new { message = "Fulfilled quantity must be between 0 and the ordered quantity." });

        line.QuantityFulfilled = req.QuantityFulfilled;

        // Partial Fulfilled is only ever set automatically from line quantities, never picked
        // manually - once the order has been manually advanced further, leave it alone.
        if (order.FulfillmentStage is FulfillmentStage.Pending or FulfillmentStage.PartialFulfilled)
        {
            var anyFulfilled = order.LineItems.Any(li => li.QuantityFulfilled > 0);
            var allFullyFulfilled = order.LineItems.Count > 0 && order.LineItems.All(li => li.QuantityFulfilled >= li.Quantity);
            if (anyFulfilled && !allFullyFulfilled)
                order.FulfillmentStage = FulfillmentStage.PartialFulfilled;
            else if (!anyFulfilled)
                order.FulfillmentStage = FulfillmentStage.Pending;
            // if every line is now fully fulfilled, leave the stage as-is - advancing to
            // Fulfilled is a manual action via the dropdown, not an automatic one.
        }

        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/generate-invoice")]
    public async Task<IActionResult> GenerateInvoice(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var order = await db.Orders.Include(o => o.LineItems).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, order.OwnerId, order.OwnerTeamId)) return Forbid();

        if (order.LineItems.Count == 0)
            return BadRequest(new { message = "Add at least one line item before generating an invoice." });
        if (order.FulfillmentStage < FulfillmentStage.FulfillCompleted)
            return BadRequest(new { message = "Mark the order as fulfillment completed before generating an invoice." });
        if (await db.Invoices.AnyAsync(i => i.OrderId == order.Id))
            return BadRequest(new { message = "An invoice has already been generated for this order." });

        // Invoices have no discount concept, so each order line's discount is folded into an
        // effective unit price, and the order-level discount becomes a synthetic line item -
        // this reproduces the order's already-discounted totals exactly.
        var lineItems = order.LineItems.Select(li => new InvoiceLineItem
        {
            ProductId = li.ProductId,
            Description = li.Description,
            Quantity = li.Quantity,
            UnitPrice = li.Quantity == 0 ? li.Total : li.Total / li.Quantity,
            Total = li.Total
        }).ToList();
        if (order.Discount != 0)
            lineItems.Add(new InvoiceLineItem { Description = "Additional discount", Quantity = 1, UnitPrice = -order.Discount, Total = -order.Discount });

        var count = await db.Invoices.CountAsync() + 1;
        var invoice = new Invoice
        {
            InvoiceNumber = $"INV-{count:D5}",
            AccountId = order.AccountId, ContactId = order.ContactId, OrderId = order.Id,
            Status = InvoiceStatus.Draft, Notes = order.Notes, TaxRate = order.TaxRate,
            OwnerId = order.OwnerId, OwnerTeamId = order.OwnerTeamId,
            LineItems = lineItems
        };
        invoice.Subtotal = invoice.LineItems.Sum(li => li.Total);
        invoice.Tax = invoice.Subtotal * invoice.TaxRate / 100;
        invoice.Total = invoice.Subtotal + invoice.Tax;

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        return NoContent();
    }

    internal async Task<string> GenerateOrderNumberAsync()
    {
        var count = await db.Orders.CountAsync() + 1;
        return $"SO-{count:D5}";
    }

    internal static decimal CalcLineTotal(OrderLineItemRequest li) => li.Quantity * li.UnitPrice * (1 - li.Discount / 100);

    internal static void RecalcTotals(Order o)
    {
        o.Subtotal = o.LineItems.Sum(li => li.Total);
        var discounted = o.Subtotal - o.Discount;
        o.Tax = discounted * o.TaxRate / 100;
        o.Total = discounted + o.Tax;
    }

    internal static OrderResponse ToResponse(Order o, Guid? invoiceId = null, string? invoiceNumber = null) => new(
        o.Id, o.OrderNumber, o.QuoteId, o.Quote?.QuoteNumber, invoiceId, invoiceNumber, o.AccountId, o.Account!.Name, o.Account.Phone, o.Account.Email,
        o.Account.PrimaryAddress is null ? null : new AddressDto(
            o.Account.PrimaryAddress.AddressLine1, o.Account.PrimaryAddress.AddressLine2, o.Account.PrimaryAddress.AddressLine3,
            o.Account.PrimaryAddress.County, o.Account.PrimaryAddress.Province, o.Account.PrimaryAddress.Country, o.Account.PrimaryAddress.PostalCode),
        o.ContactId, o.Contact != null ? o.Contact.FirstName + " " + o.Contact.LastName : null,
        o.IsActive, o.FulfillmentStage.ToString(), o.Notes, o.TaxRate, o.Discount, o.Subtotal, o.Tax, o.Total, o.CreatedAt,
        o.LineItems.Select(li => new OrderLineItemResponse(li.Id, li.ProductId, li.Product?.ProductNumber, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Discount, li.Total, li.QuantityFulfilled)).ToList(),
        o.OwnerId, o.Owner is not null ? $"{o.Owner.FirstName} {o.Owner.LastName}" : null,
        o.OwnerTeamId, o.OwnerTeam?.Name);
}
