using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityEmailDirection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Direction",
                table: "Activities",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Direction",
                table: "Activities");
        }
    }
}
