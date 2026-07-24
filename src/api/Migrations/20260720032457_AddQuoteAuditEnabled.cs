using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteAuditEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AuditEnabled",
                table: "Quotes",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuditEnabled",
                table: "Quotes");
        }
    }
}
