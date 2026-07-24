using System.Globalization;
using System.Security.Claims;
using CRMPlus.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace CRMPlus.Api.Services;

/// <summary>
/// Generic, entity-agnostic audit trail: on every SaveChanges, diffs every tracked entity that
/// opts in via an "AuditEnabled" property and writes one AuditLog (transaction header) with one
/// AuditLogChange row per actually-changed column. New entities/columns are picked up automatically
/// via EF metadata - no per-entity code needed.
///
/// Foreign-key values (e.g. AccountId, OwnerId) are resolved to the related record's display name
/// HERE, at write time, and stored as plain text - not re-resolved at read time - so historical rows
/// stay accurate even if the related record is later renamed/edited.
/// </summary>
public class AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    private static readonly string[] SensitiveFieldNames = ["Password", "Hash", "Token", "Secret"];

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null) await BuildAuditLogsAsync(eventData.Context, cancellationToken);
        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private async Task BuildAuditLogsAsync(DbContext context, CancellationToken ct)
    {
        var user = httpContextAccessor.HttpContext?.User;
        Guid? userId = Guid.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;
        var userEmail = user?.FindFirstValue(ClaimTypes.Email);

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && e.Entity is not AuditLogChange)
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        var displayNameCache = new Dictionary<(Type Type, Guid Id), string?>();

        foreach (var entry in entries)
        {
            // "AuditEnabled" column presence is the entity-TYPE opt-in signal (any entity that adds
            // this column gets tracked automatically); its per-record value is not a gate - all
            // Create/Update/Delete changes are logged for every record of an opted-in entity type.
            if (entry.Metadata.FindProperty("AuditEnabled") is null) continue;

            if (entry.State == EntityState.Added)
                await LogCreateAsync(context, entry, userId, userEmail, displayNameCache, ct);
            else if (entry.State == EntityState.Deleted)
                await LogDeleteAsync(context, entry, userId, userEmail, displayNameCache, ct);
            else if (entry.State == EntityState.Modified)
                await LogUpdateAsync(context, entry, userId, userEmail, displayNameCache, ct);
        }
    }

    private async Task LogCreateAsync(DbContext context, EntityEntry entry, Guid? userId, string? userEmail,
        Dictionary<(Type, Guid), string?> cache, CancellationToken ct)
    {
        var changes = new List<AuditLogChange>();
        foreach (var prop in entry.Properties)
        {
            if (IsSkipped(prop.Metadata.Name)) continue;
            var val = await FormatValueAsync(context, entry, prop.Metadata.Name, prop.CurrentValue, cache, ct);
            if (val is null) continue;
            changes.Add(new AuditLogChange { FieldName = prop.Metadata.Name, OldValue = null, NewValue = val });
        }
        if (changes.Count == 0) return;
        AddAuditLog(context, entry, AuditAction.Created, changes, userId, userEmail);
    }

    private async Task LogDeleteAsync(DbContext context, EntityEntry entry, Guid? userId, string? userEmail,
        Dictionary<(Type, Guid), string?> cache, CancellationToken ct)
    {
        var changes = new List<AuditLogChange>();
        foreach (var prop in entry.Properties)
        {
            if (IsSkipped(prop.Metadata.Name)) continue;
            var val = await FormatValueAsync(context, entry, prop.Metadata.Name, prop.OriginalValue, cache, ct);
            if (val is null) continue;
            changes.Add(new AuditLogChange { FieldName = prop.Metadata.Name, OldValue = val, NewValue = null });
        }
        if (changes.Count == 0) return;
        AddAuditLog(context, entry, AuditAction.Deleted, changes, userId, userEmail);
    }

    private async Task LogUpdateAsync(DbContext context, EntityEntry entry, Guid? userId, string? userEmail,
        Dictionary<(Type, Guid), string?> cache, CancellationToken ct)
    {
        var changes = new List<AuditLogChange>();
        foreach (var prop in entry.Properties.Where(p => p.IsModified))
        {
            if (IsSkipped(prop.Metadata.Name)) continue;
            var oldVal = await FormatValueAsync(context, entry, prop.Metadata.Name, prop.OriginalValue, cache, ct);
            var newVal = await FormatValueAsync(context, entry, prop.Metadata.Name, prop.CurrentValue, cache, ct);
            if (oldVal == newVal) continue;
            changes.Add(new AuditLogChange { FieldName = prop.Metadata.Name, OldValue = oldVal, NewValue = newVal });
        }
        if (changes.Count == 0) return;

        var action = AuditAction.Updated;
        foreach (var fk in entry.Metadata.GetForeignKeys())
        {
            foreach (var fkProp in fk.Properties)
            {
                var propEntry = entry.Property(fkProp.Name);
                if (!propEntry.IsModified) continue;
                var wasNull = propEntry.OriginalValue is null;
                var isNull = propEntry.CurrentValue is null;
                if (wasNull && !isNull) action = AuditAction.Associated;
                else if (!wasNull && isNull) action = AuditAction.Deassociated;
            }
            if (action != AuditAction.Updated) break;
        }

        AddAuditLog(context, entry, action, changes, userId, userEmail);
    }

    private static void AddAuditLog(DbContext context, EntityEntry entry, AuditAction action, List<AuditLogChange> changes, Guid? userId, string? userEmail)
    {
        var idProp = entry.Metadata.FindProperty("Id");
        if (idProp is null) return;
        var idPropEntry = entry.Property(idProp.Name);
        var idValue = entry.State == EntityState.Deleted ? idPropEntry.OriginalValue : idPropEntry.CurrentValue;
        if (idValue is not Guid entityId) return;

        var log = new AuditLog
        {
            EntityName = entry.Metadata.ClrType.Name,
            EntityId = entityId,
            Action = action,
            UserId = userId,
            UserEmail = userEmail,
            Timestamp = DateTime.UtcNow,
        };
        foreach (var change in changes) log.Changes.Add(change);
        context.Add(log);
    }

    private static bool IsSkipped(string fieldName) =>
        fieldName is "Id" or "UpdatedAt" || SensitiveFieldNames.Any(s => fieldName.Contains(s, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Formats a raw property value for storage. GUID-shaped values that belong to a foreign key
    /// are resolved to the related record's display name (via EF's own FK metadata - generic,
    /// works for any relationship) and that resolved text is what gets stored, permanently.
    /// </summary>
    private static async Task<string?> FormatValueAsync(DbContext context, EntityEntry entry, string fieldName,
        object? rawValue, Dictionary<(Type Type, Guid Id), string?> cache, CancellationToken ct)
    {
        if (rawValue is Guid guidId)
        {
            var fk = entry.Metadata.GetForeignKeys().FirstOrDefault(fk => fk.Properties.Any(p => p.Name == fieldName));
            var targetType = fk?.PrincipalEntityType.ClrType;
            if (targetType is not null)
            {
                var cacheKey = (targetType, guidId);
                if (!cache.TryGetValue(cacheKey, out var display))
                {
                    var relatedEntity = await context.FindAsync(targetType, [guidId], ct);
                    display = relatedEntity is null ? null : GetDisplayName(relatedEntity);
                    cache[cacheKey] = display;
                }
                if (display is not null) return display;
            }
        }

        return FormatValue(rawValue);
    }

    private static string? GetDisplayName(object entity)
    {
        var type = entity.GetType();
        if (type.GetProperty("Name")?.GetValue(entity) is string name && !string.IsNullOrWhiteSpace(name))
            return name;

        var firstProp = type.GetProperty("FirstName");
        var lastProp = type.GetProperty("LastName");
        if (firstProp is not null && lastProp is not null)
        {
            var full = $"{firstProp.GetValue(entity)} {lastProp.GetValue(entity)}".Trim();
            if (!string.IsNullOrWhiteSpace(full)) return full;
        }

        // Address-shaped entities have no Name/FirstName+LastName - summarize like the frontend does
        // (addressSummary in AccountDetail.tsx): line 1, province-or-county, country.
        if (type.GetProperty("AddressLine1") is not null)
        {
            var line1 = type.GetProperty("AddressLine1")?.GetValue(entity) as string;
            var province = type.GetProperty("Province")?.GetValue(entity) as string;
            var county = type.GetProperty("County")?.GetValue(entity) as string;
            var country = type.GetProperty("Country")?.GetValue(entity) as string;
            var summary = string.Join(", ", new[] { line1, string.IsNullOrWhiteSpace(province) ? county : province, country }
                .Where(v => !string.IsNullOrWhiteSpace(v)));
            if (!string.IsNullOrWhiteSpace(summary)) return summary;
        }

        return null;
    }

    private static string? FormatValue(object? value) => value switch
    {
        null => null,
        bool b => b ? "Yes" : "No",
        DateTime dt => dt.ToString("g", CultureInfo.InvariantCulture),
        Enum e => e.ToString(),
        _ => Convert.ToString(value, CultureInfo.InvariantCulture),
    };
}
