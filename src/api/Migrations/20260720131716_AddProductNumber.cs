using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProductNumber",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                WITH numbered AS (
                    SELECT Id, ROW_NUMBER() OVER (ORDER BY CreatedAt) AS rn FROM Products
                )
                UPDATE p SET p.ProductNumber = 'PR-' + RIGHT('00000' + CAST(numbered.rn AS varchar(10)), 5)
                FROM Products p INNER JOIN numbered ON p.Id = numbered.Id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProductNumber",
                table: "Products");
        }
    }
}
