using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record UserResponse(int Id, string FirstName, string LastName, string Email, string Role, int? TeamId, string? TeamName, bool IsActive, DateTime CreatedAt);

public record UpdateUserRequest(string FirstName, string LastName, UserRole Role, int? TeamId, bool IsActive);

public record TeamRequest(string Name, int? ManagerId);

public record TeamResponse(int Id, string Name, int? ManagerId, string? ManagerName, int MemberCount, DateTime CreatedAt);
