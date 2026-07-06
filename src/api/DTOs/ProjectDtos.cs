using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record ProjectRequest(
    string Name,
    string? Description,
    ProjectStatus Status,
    DateTime? StartDate,
    DateTime? EndDate);

public record ProjectResponse(
    int Id,
    string Name,
    string? Description,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int WorkItemCount,
    DateTime CreatedAt);
