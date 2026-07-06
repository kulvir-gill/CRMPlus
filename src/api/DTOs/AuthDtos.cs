using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string FirstName, string LastName, string Email, string Password, UserRole Role = UserRole.Employee, int? TeamId = null);

public record AuthResponse(string Token, int UserId, string Email, string FirstName, string LastName, string Role);
