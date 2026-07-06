using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record WorkItemRequest(
    string Title,
    string? Description,
    int ProjectId,
    int? AssignedUserId,
    WorkItemStatus Status,
    WorkItemPriority Priority,
    DateTime? DueDate,
    decimal EstimatedHours);

public record WorkItemResponse(
    int Id,
    string Title,
    string? Description,
    int ProjectId,
    string ProjectName,
    int? AssignedUserId,
    string? AssignedUserName,
    string Status,
    string Priority,
    DateTime? DueDate,
    decimal EstimatedHours,
    decimal ActualHours,
    DateTime CreatedAt);
