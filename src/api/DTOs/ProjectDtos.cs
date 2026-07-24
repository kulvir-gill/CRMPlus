using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record ProjectRequest(
    string Name,
    string? Description,
    ProjectStatus Status,
    bool IsActive,
    DateTime? StartDate,
    DateTime? EndDate,
    Guid? OwnerId = null,
    Guid? OwnerTeamId = null);

public record ProjectListResponse(List<ProjectResponse> Items, int TotalCount);

public record ProjectResponse(
    Guid Id,
    string Name,
    string? Description,
    string Status,
    bool IsActive,
    DateTime? StartDate,
    DateTime? EndDate,
    int WorkItemCount,
    DateTime CreatedAt,
    Guid? OwnerId,
    string? OwnerName,
    Guid? OwnerTeamId,
    string? OwnerTeamName);
