using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record WorkItemRequest(
    string Title,
    string? Description,
    Guid ProjectId,
    Guid? AssignedUserId,
    Guid? AssignedTeamId,
    WorkItemStatus Status,
    WorkItemPriority Priority,
    bool IsActive,
    DateTime? DueDate,
    decimal EstimatedHours);

public record WorkItemListResponse(List<WorkItemResponse> Items, int TotalCount);

public record WorkItemResponse(
    Guid Id,
    string Title,
    string? Description,
    Guid ProjectId,
    string ProjectName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? AssignedTeamId,
    string? AssignedTeamName,
    string Status,
    string Priority,
    bool IsActive,
    DateTime? DueDate,
    decimal EstimatedHours,
    decimal ActualHours,
    DateTime CreatedAt);
