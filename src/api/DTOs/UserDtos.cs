namespace CRMPlus.Api.DTOs;

public record UserResponse(Guid Id, string FirstName, string LastName, string Email, string? Title,
    List<SecurityRoleRef> SecurityRoles, List<SecurityRoleRef> InheritedSecurityRoles,
    List<Guid> TeamIds, List<string> TeamNames, Guid? ManagerId, string? ManagerName, bool IsActive, DateTime CreatedAt);

public record UserListResponse(List<UserResponse> Items, int TotalCount);

public record CreateUserRequest(string FirstName, string LastName, string Email, string Password, string? Title,
    List<Guid>? SecurityRoleIds, List<Guid>? TeamIds, Guid? ManagerId, bool IsActive);

public record UpdateUserRequest(string FirstName, string LastName, string? Title,
    List<Guid>? SecurityRoleIds, List<Guid>? TeamIds, Guid? ManagerId, bool IsActive);

public record ResetPasswordRequest(string NewPassword);

public record TeamRequest(string Name, Guid? ManagerId, List<Guid>? SecurityRoleIds);

public record TeamResponse(Guid Id, string Name, Guid? ManagerId, string? ManagerName, List<SecurityRoleRef> SecurityRoles, int MemberCount, DateTime CreatedAt);
