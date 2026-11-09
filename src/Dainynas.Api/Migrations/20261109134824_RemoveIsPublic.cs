using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dainynas.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsPublic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "Songs");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "Albums");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "Songs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "Albums",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
