using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertUserRoleToRolesMultiSelect : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Roles",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                UPDATE Users SET Roles = CASE Role
                    WHEN 0 THEN 'Employee'
                    WHEN 1 THEN 'Manager'
                    WHEN 2 THEN 'Admin'
                    ELSE 'Employee'
                END");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE Users SET Role = CASE
                    WHEN Roles LIKE '%Admin%' THEN 2
                    WHEN Roles LIKE '%Manager%' THEN 1
                    ELSE 0
                END");

            migrationBuilder.DropColumn(
                name: "Roles",
                table: "Users");
        }
    }
}
