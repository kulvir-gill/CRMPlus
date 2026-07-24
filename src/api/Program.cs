using System.Text;
using System.Text.Json.Serialization;
using CRMPlus.Api.Data;
using CRMPlus.Api.Models;
using CRMPlus.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditSaveChangesInterceptor>();

builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"))
       .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>()));

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<CurrentUserService>();
builder.Services.AddScoped<OwnershipService>();
builder.Services.AddScoped<QuoteDocumentService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        var key = builder.Configuration["Jwt:Key"]!;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        };
    });

builder.Services.AddAuthorization(opt =>
{
    // Admin always bypasses module checks; everyone else needs the module claim (direct or team-inherited).
    // Setting is the exception: it's Admin-only, never grantable via a role's Modules assignment.
    foreach (var module in AppModules.All)
    {
        if (module == AppModules.Setting)
        {
            opt.AddPolicy($"Module:{module}", p => p.RequireRole("Admin"));
        }
        else
        {
            opt.AddPolicy($"Module:{module}", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole("Admin") || ctx.User.HasClaim(TokenService.ModuleClaimType, module)));
        }
    }
    opt.AddPolicy("Module:resource-or-setting", p => p.RequireAssertion(ctx =>
        ctx.User.IsInRole("Admin")
        || ctx.User.HasClaim(TokenService.ModuleClaimType, AppModules.Resource)));
});
builder.Services.AddControllers()
    .AddJsonOptions(opt => opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.WithOrigins("http://localhost:5173", "http://localhost:3000")
        .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbSeeder.SeedAsync(db);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
