using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record ActivityRequest(
    ActivityType Type,
    string Subject,
    string? Body,
    EmailDirection? Direction,
    Guid? AccountId,
    Guid? ContactId);

public record ActivityResponse(
    Guid Id,
    string Type,
    string Subject,
    string? Body,
    string? Direction,
    Guid? AccountId,
    string? AccountName,
    Guid? ContactId,
    string? ContactName,
    Guid UserId,
    string UserName,
    DateTime CreatedAt);
