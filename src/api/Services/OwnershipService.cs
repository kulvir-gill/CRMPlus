using CRMPlus.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Services;

public class OwnershipService(AppDbContext db)
{
    // Ids of users whose records are visible under UserLevel access: the user themselves,
    // plus everyone who shares at least one team with them.
    public async Task<List<Guid>> GetVisibleOwnerIdsAsync(Guid userId)
    {
        var teammateIds = await db.Users
            .Where(u => u.Id == userId)
            .SelectMany(u => u.Teams)
            .SelectMany(t => t.Members)
            .Select(m => m.Id)
            .Distinct()
            .ToListAsync();

        if (!teammateIds.Contains(userId)) teammateIds.Add(userId);
        return teammateIds;
    }

    // Ids of the teams a user belongs to - used for entities (like WorkItem) that can be owned by a team directly.
    public async Task<List<Guid>> GetUserTeamIdsAsync(Guid userId) =>
        await db.Users
            .Where(u => u.Id == userId)
            .SelectMany(u => u.Teams)
            .Select(t => t.Id)
            .ToListAsync();

    // Is a record with this owner/ownerTeam visible to userId under UserLevel access?
    public async Task<bool> IsVisibleAsync(Guid userId, Guid? ownerId, Guid? ownerTeamId)
    {
        if (ownerTeamId.HasValue)
        {
            var userTeamIds = await GetUserTeamIdsAsync(userId);
            if (userTeamIds.Contains(ownerTeamId.Value)) return true;
        }
        if (ownerId.HasValue)
        {
            var visibleOwnerIds = await GetVisibleOwnerIdsAsync(userId);
            if (visibleOwnerIds.Contains(ownerId.Value)) return true;
        }
        return false;
    }

    // Does userId "own" this record - assigned to them directly, or to one of their own teams?
    public async Task<bool> OwnsAsync(Guid userId, Guid? ownerId, Guid? ownerTeamId)
    {
        if (ownerId == userId) return true;
        if (ownerTeamId is null) return false;
        var userTeamIds = await GetUserTeamIdsAsync(userId);
        return userTeamIds.Contains(ownerTeamId.Value);
    }

    // UserLevel Create: honor a requested team only if it's the caller's own team; otherwise force self-ownership.
    public async Task<(Guid? OwnerId, Guid? OwnerTeamId)> ResolveUserLevelOwnershipAsync(Guid userId, Guid? requestedOwnerId, Guid? requestedTeamId)
    {
        if (requestedTeamId.HasValue)
        {
            var userTeamIds = await GetUserTeamIdsAsync(userId);
            if (userTeamIds.Contains(requestedTeamId.Value)) return (null, requestedTeamId);
        }
        return (userId, null);
    }
}
