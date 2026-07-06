using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record ActivityRequest(
    ActivityType Type,
    string Subject,
    string? Body,
    int? AccountId,
    int? ContactId);

public record ActivityResponse(
    int Id,
    string Type,
    string Subject,
    string? Body,
    int? AccountId,
    string? AccountName,
    int? ContactId,
    string? ContactName,
    int UserId,
    string UserName,
    DateTime CreatedAt);
