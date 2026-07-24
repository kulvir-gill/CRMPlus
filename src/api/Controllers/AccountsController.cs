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
[Authorize(Policy = "Module:crm")]
public class AccountsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "name", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Accounts
            .Include(a => a.Contacts)
            .Include(a => a.Activities)
            .Include(a => a.PrimaryContact)
            .Include(a => a.PrimaryAddress)
            .Include(a => a.Addresses)
            .Include(a => a.Owner)
            .Include(a => a.OwnerTeam)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(a =>
                (a.OwnerId != null && visibleOwnerIds.Contains(a.OwnerId.Value)) ||
                (a.OwnerTeamId != null && userTeamIds.Contains(a.OwnerTeamId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.Name.Contains(search) || (a.Email != null && a.Email.Contains(search)));
        if (isActive.HasValue)
            query = query.Where(a => a.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();

        query = ApplySort(query, sortField, sortDir);

        var accounts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new AccountListResponse(accounts.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Account> ApplySort(IQueryable<Account> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "accountnumber" => desc ? query.OrderByDescending(a => a.AccountNumber) : query.OrderBy(a => a.AccountNumber),
            "email" => desc ? query.OrderByDescending(a => a.Email) : query.OrderBy(a => a.Email),
            "phone" => desc ? query.OrderByDescending(a => a.Phone) : query.OrderBy(a => a.Phone),
            "industry" => desc ? query.OrderByDescending(a => a.Industry) : query.OrderBy(a => a.Industry),
            "isactive" => desc ? query.OrderByDescending(a => a.IsActive) : query.OrderBy(a => a.IsActive),
            "contactcount" => desc ? query.OrderByDescending(a => a.Contacts.Count) : query.OrderBy(a => a.Contacts.Count),
            "activitycount" => desc ? query.OrderByDescending(a => a.Activities.Count) : query.OrderBy(a => a.Activities.Count),
            _ => desc ? query.OrderByDescending(a => a.Name) : query.OrderBy(a => a.Name),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var a = await db.Accounts
            .Include(a => a.Contacts)
            .Include(a => a.Activities)
            .Include(a => a.PrimaryContact)
            .Include(a => a.PrimaryAddress)
            .Include(a => a.Addresses)
            .Include(a => a.Owner)
            .Include(a => a.OwnerTeam)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (a is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, a.OwnerId, a.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(a));
    }

    [HttpPost]
    public async Task<IActionResult> Create(AccountRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An account can be owned by a user or a team, not both." });

        if (HasDuplicateTypes(req.Addresses ?? []))
            return BadRequest(new { message = "An address type can only be assigned to one address." });

        if (await EmailInUseAsync(req.Email, null))
            return BadRequest(new { message = "An account with this email already exists." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var account = new Account
        {
            AccountNumber = await GenerateAccountNumberAsync(),
            Name = req.Name, Phone = req.Phone, Email = req.Email,
            Industry = req.Industry, TaxRate = req.TaxRate,
            AuditEnabled = req.AuditEnabled, IsActive = req.IsActive, PrimaryContactId = req.PrimaryContactId,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
            PrimaryAddress = ToAddress(req.PrimaryAddress),
            Addresses = (req.Addresses ?? []).Where(HasAnyValue).Select(ToAccountAddress).ToList(),
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        await CreateAccountDocumentFolderAsync(account.AccountNumber);
        return CreatedAtAction(nameof(GetById), new { id = account.Id }, ToResponse(account));
    }

    private async Task CreateAccountDocumentFolderAsync(string accountNumber)
    {
        var settings = await db.QuoteSettings.FirstOrDefaultAsync();
        if (string.IsNullOrWhiteSpace(settings?.DocumentLocation)) return;
        try
        {
            Directory.CreateDirectory(Path.Combine(settings.DocumentLocation, accountNumber));
        }
        catch
        {
            // Document storage is a best-effort convenience; a bad/inaccessible path shouldn't block account creation.
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, AccountRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An account can be owned by a user or a team, not both." });

        if (HasDuplicateTypes(req.Addresses ?? []))
            return BadRequest(new { message = "An address type can only be assigned to one address." });

        if (await EmailInUseAsync(req.Email, id))
            return BadRequest(new { message = "An account with this email already exists." });

        var account = await db.Accounts
            .Include(a => a.PrimaryAddress)
            .Include(a => a.Addresses)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (account is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, account.OwnerId, account.OwnerTeamId)) return Forbid();

        account.Name = req.Name; account.Phone = req.Phone; account.Email = req.Email;
        account.Industry = req.Industry; account.TaxRate = req.TaxRate;
        account.AuditEnabled = req.AuditEnabled; account.IsActive = req.IsActive; account.PrimaryContactId = req.PrimaryContactId;
        account.OwnerId = req.OwnerId; account.OwnerTeamId = req.OwnerTeamId;
        account.UpdatedAt = DateTime.UtcNow;

        if (req.PrimaryAddress is null)
        {
            account.PrimaryAddress = null;
        }
        else if (account.PrimaryAddress is not null)
        {
            account.PrimaryAddress.AddressLine1 = req.PrimaryAddress.AddressLine1;
            account.PrimaryAddress.AddressLine2 = req.PrimaryAddress.AddressLine2;
            account.PrimaryAddress.AddressLine3 = req.PrimaryAddress.AddressLine3;
            account.PrimaryAddress.County = req.PrimaryAddress.County;
            account.PrimaryAddress.Province = req.PrimaryAddress.Province;
            account.PrimaryAddress.Country = req.PrimaryAddress.Country;
            account.PrimaryAddress.PostalCode = req.PrimaryAddress.PostalCode;
        }
        else
        {
            account.PrimaryAddress = ToAddress(req.PrimaryAddress);
        }

        db.Addresses.RemoveRange(account.Addresses);
        account.Addresses = (req.Addresses ?? []).Where(HasAnyValue).Select(ToAccountAddress).ToList();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(AccountBulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No accounts selected." });

        var idQuery = db.Accounts.Where(a => req.Ids.Contains(a.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(a =>
                a.OwnerId == currentUser.UserId ||
                (a.OwnerTeamId != null && userTeamIds.Contains(a.OwnerTeamId.Value)));
        }
        var accounts = await idQuery.ToListAsync();
        foreach (var account in accounts)
        {
            account.IsActive = req.IsActive;
            account.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = accounts.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var account = await db.Accounts.Include(a => a.Addresses).FirstOrDefaultAsync(a => a.Id == id);
        if (account is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, account.OwnerId, account.OwnerTeamId)) return Forbid();

        db.Addresses.RemoveRange(account.Addresses);
        db.Accounts.Remove(account);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> EmailInUseAsync(string? email, Guid? excludeId)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        return await db.Accounts.AnyAsync(a =>
            a.Email != null && a.Email.ToLower() == email.ToLower() && a.Id != excludeId);
    }

    private async Task<string> GenerateAccountNumberAsync()
    {
        var numbers = await db.Accounts.Select(a => a.AccountNumber).ToListAsync();
        var max = numbers.Select(n => int.TryParse(n, out var v) ? v : 0).DefaultIfEmpty(0).Max();
        var next = max + 1;
        if (next > 9999) throw new InvalidOperationException("Account number range (0000-9999) exhausted.");
        return next.ToString("D4");
    }

    private static Address? ToAddress(AddressDto? dto)
    {
        if (dto is null) return null;
        if (dto.AddressLine1 is null && dto.AddressLine2 is null && dto.AddressLine3 is null &&
            dto.County is null && dto.Province is null && dto.Country is null && dto.PostalCode is null)
            return null;

        return new Address
        {
            AddressLine1 = dto.AddressLine1, AddressLine2 = dto.AddressLine2, AddressLine3 = dto.AddressLine3,
            County = dto.County, Province = dto.Province, Country = dto.Country, PostalCode = dto.PostalCode,
        };
    }

    private static bool HasAnyValue(AccountAddressRequest r) =>
        (r.AddressType?.Count ?? 0) > 0 || !string.IsNullOrWhiteSpace(r.AddressLine1) ||
        !string.IsNullOrWhiteSpace(r.AddressLine2) || !string.IsNullOrWhiteSpace(r.AddressLine3) ||
        !string.IsNullOrWhiteSpace(r.County) || !string.IsNullOrWhiteSpace(r.Province) ||
        !string.IsNullOrWhiteSpace(r.Country) || !string.IsNullOrWhiteSpace(r.PostalCode);

    private static bool HasDuplicateTypes(List<AccountAddressRequest> addresses)
    {
        var allTypes = addresses.SelectMany(a => a.AddressType ?? []).Select(t => t.Trim()).Where(t => t.Length > 0);
        return allTypes.GroupBy(t => t, StringComparer.OrdinalIgnoreCase).Any(g => g.Count() > 1);
    }

    private static Address ToAccountAddress(AccountAddressRequest r) => new()
    {
        AddressType = r.AddressType is null || r.AddressType.Count == 0 ? null : string.Join(",", r.AddressType),
        AddressLine1 = r.AddressLine1, AddressLine2 = r.AddressLine2, AddressLine3 = r.AddressLine3,
        County = r.County, Province = r.Province, Country = r.Country, PostalCode = r.PostalCode,
    };

    private static List<string> SplitTypes(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? [] : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static AccountResponse ToResponse(Account a) => new(
        a.Id, a.AccountNumber, a.Name, a.Phone, a.Email, a.Industry, a.TaxRate, a.AuditEnabled, a.IsActive, a.CreatedAt,
        a.Contacts?.Count ?? 0, a.Activities?.Count ?? 0,
        a.PrimaryContactId, a.PrimaryContact is not null ? $"{a.PrimaryContact.FirstName} {a.PrimaryContact.LastName}" : null,
        a.OwnerId, a.Owner is not null ? $"{a.Owner.FirstName} {a.Owner.LastName}" : null,
        a.OwnerTeamId, a.OwnerTeam?.Name,
        a.PrimaryAddress is null ? null : new AddressDto(
            a.PrimaryAddress.AddressLine1, a.PrimaryAddress.AddressLine2, a.PrimaryAddress.AddressLine3,
            a.PrimaryAddress.County, a.PrimaryAddress.Province, a.PrimaryAddress.Country, a.PrimaryAddress.PostalCode),
        (a.Addresses ?? []).Select(addr => new AccountAddressDto(
            addr.Id, SplitTypes(addr.AddressType), addr.AddressLine1, addr.AddressLine2, addr.AddressLine3,
            addr.County, addr.Province, addr.Country, addr.PostalCode)).ToList());
}
