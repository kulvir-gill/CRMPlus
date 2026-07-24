using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityRolesAndUserTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SecurityRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TeamSecurityRoles",
                columns: table => new
                {
                    SecurityRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamSecurityRoles", x => new { x.SecurityRoleId, x.TeamId });
                    table.ForeignKey(
                        name: "FK_TeamSecurityRoles_SecurityRoles_SecurityRoleId",
                        column: x => x.SecurityRoleId,
                        principalTable: "SecurityRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamSecurityRoles_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSecurityRoles",
                columns: table => new
                {
                    SecurityRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSecurityRoles", x => new { x.SecurityRoleId, x.UserId });
                    table.ForeignKey(
                        name: "FK_UserSecurityRoles_SecurityRoles_SecurityRoleId",
                        column: x => x.SecurityRoleId,
                        principalTable: "SecurityRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserSecurityRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityRoles_Name",
                table: "SecurityRoles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamSecurityRoles_TeamId",
                table: "TeamSecurityRoles",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSecurityRoles_UserId",
                table: "UserSecurityRoles",
                column: "UserId");

            // Seed the 3 built-in roles that replace the old fixed UserRole enum, with stable IDs.
            migrationBuilder.Sql(@"
                INSERT INTO SecurityRoles (Id, Name, Description, CreatedAt) VALUES
                ('10000000-0000-0000-0000-000000000001', 'Employee', 'Standard employee access', SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000002', 'Manager', 'Team manager access', SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000003', 'Admin', 'Full administrative access', SYSUTCDATETIME())");

            // Backfill direct role assignments from the old comma-joined Users.Roles column before dropping it.
            migrationBuilder.Sql(@"
                INSERT INTO UserSecurityRoles (SecurityRoleId, UserId)
                SELECT '10000000-0000-0000-0000-000000000001', Id FROM Users WHERE ',' + Roles + ',' LIKE '%,Employee,%'
                UNION ALL
                SELECT '10000000-0000-0000-0000-000000000002', Id FROM Users WHERE ',' + Roles + ',' LIKE '%,Manager,%'
                UNION ALL
                SELECT '10000000-0000-0000-0000-000000000003', Id FROM Users WHERE ',' + Roles + ',' LIKE '%,Admin,%'");

            migrationBuilder.DropColumn(
                name: "Roles",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Roles",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Best-effort backfill: reconstruct a comma-joined Roles string from direct security role assignments.
            migrationBuilder.Sql(@"
                UPDATE u SET u.Roles = COALESCE(x.Names, '')
                FROM Users u
                OUTER APPLY (
                    SELECT STRING_AGG(sr.Name, ',') AS Names
                    FROM UserSecurityRoles usr
                    JOIN SecurityRoles sr ON sr.Id = usr.SecurityRoleId
                    WHERE usr.UserId = u.Id
                ) x");

            migrationBuilder.DropTable(
                name: "TeamSecurityRoles");

            migrationBuilder.DropTable(
                name: "UserSecurityRoles");

            migrationBuilder.DropTable(
                name: "SecurityRoles");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Users");
        }
    }
}
