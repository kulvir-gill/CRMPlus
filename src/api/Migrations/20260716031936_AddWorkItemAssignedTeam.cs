using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkItemAssignedTeam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedTeamId",
                table: "WorkItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_AssignedTeamId",
                table: "WorkItems",
                column: "AssignedTeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkItems_Teams_AssignedTeamId",
                table: "WorkItems",
                column: "AssignedTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkItems_Teams_AssignedTeamId",
                table: "WorkItems");

            migrationBuilder.DropIndex(
                name: "IX_WorkItems_AssignedTeamId",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "AssignedTeamId",
                table: "WorkItems");
        }
    }
}
