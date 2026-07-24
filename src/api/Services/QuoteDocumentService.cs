using CRMPlus.Api.Models;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System.Diagnostics;

namespace CRMPlus.Api.Services;

/// <summary>
/// Generates quote documents by merging quote data into the Word template at Templates/QuoteTemplate.docx
/// (placeholders like {{QuoteNumber}}, and a {{Item.*}} table row cloned once per line item), then converts
/// the merged document to PDF via a headless LibreOffice ("soffice") process.
/// </summary>
public class QuoteDocumentService(IWebHostEnvironment env)
{
    private string TemplatePath => Path.Combine(env.ContentRootPath, "Templates", "QuoteTemplate.docx");

    public async Task<byte[]> GenerateQuotePdfAsync(Quote quote, CancellationToken ct = default)
    {
        var docxBytes = MergeTemplate(quote);
        return await ConvertDocxToPdfAsync(docxBytes, ct);
    }

    private byte[] MergeTemplate(Quote quote)
    {
        using var stream = new MemoryStream();
        using (var templateFile = File.OpenRead(TemplatePath))
            templateFile.CopyTo(stream);
        stream.Position = 0;

        using (var doc = WordprocessingDocument.Open(stream, true))
        {
            var body = doc.MainDocumentPart!.Document!.Body!;

            MergeLineItemRows(body, quote);
            ReplaceSimpleTokens(body, BuildTokens(quote));

            doc.MainDocumentPart.Document.Save();
        }

        return stream.ToArray();
    }

    private static void MergeLineItemRows(Body body, Quote quote)
    {
        var anchorRow = body.Descendants<TableRow>().FirstOrDefault(r => r.InnerText.Contains("{{Item.Description}}"));
        if (anchorRow is null) return;

        if (quote.LineItems.Count == 0)
        {
            var empty = (TableRow)anchorRow.CloneNode(true);
            ReplaceRowTokens(empty, new Dictionary<string, string>
            {
                ["{{Item.ProductNumber}}"] = "", ["{{Item.Product}}"] = "", ["{{Item.Description}}"] = "No line items",
                ["{{Item.Quantity}}"] = "", ["{{Item.UnitPrice}}"] = "", ["{{Item.Discount}}"] = "", ["{{Item.Total}}"] = "",
            });
            anchorRow.InsertBeforeSelf(empty);
        }
        else
        {
            foreach (var li in quote.LineItems)
            {
                var row = (TableRow)anchorRow.CloneNode(true);
                ReplaceRowTokens(row, new Dictionary<string, string>
                {
                    ["{{Item.ProductNumber}}"] = li.Product?.ProductNumber ?? "—",
                    ["{{Item.Product}}"] = li.Product?.Name ?? "—",
                    ["{{Item.Description}}"] = li.Description,
                    ["{{Item.Quantity}}"] = li.Quantity.ToString("0.##"),
                    ["{{Item.UnitPrice}}"] = $"${li.UnitPrice:0.00}",
                    ["{{Item.Discount}}"] = $"{li.Discount:0.##}%",
                    ["{{Item.Total}}"] = $"${li.Total:0.00}",
                });
                anchorRow.InsertBeforeSelf(row);
            }
        }

        anchorRow.Remove();
    }

    private static void ReplaceRowTokens(TableRow row, Dictionary<string, string> tokens)
    {
        foreach (var text in row.Descendants<Text>())
            foreach (var (token, value) in tokens)
                if (text.Text.Contains(token)) text.Text = text.Text.Replace(token, value);
    }

    private static void ReplaceSimpleTokens(Body body, Dictionary<string, string> tokens)
    {
        foreach (var text in body.Descendants<Text>())
        {
            if (!text.Text.Contains("{{")) continue;
            foreach (var (token, value) in tokens)
                if (text.Text.Contains(token)) text.Text = text.Text.Replace(token, value);
        }
    }

    private static Dictionary<string, string> BuildTokens(Quote quote)
    {
        var a = quote.Account;
        var addr = a?.PrimaryAddress;
        var cityLine = string.Join(", ", new[] { addr?.County, addr?.Province, addr?.PostalCode }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var ownerName = quote.Owner is not null ? $"{quote.Owner.FirstName} {quote.Owner.LastName}" : quote.OwnerTeam?.Name ?? "—";
        var itemsDiscount = quote.LineItems.Sum(li => li.Quantity * li.UnitPrice * li.Discount / 100);
        var totalDiscount = itemsDiscount + quote.Discount;

        return new Dictionary<string, string>
        {
            ["{{QuoteNumber}}"] = quote.QuoteNumber,
            ["{{Version}}"] = quote.Version.ToString(),
            ["{{OwnerName}}"] = ownerName,
            ["{{Status}}"] = quote.Status.ToString(),
            ["{{CreatedDate}}"] = quote.CreatedAt.ToString("d"),
            ["{{ValidUntil}}"] = quote.ValidUntil?.ToString("d") ?? "—",
            ["{{AccountName}}"] = a?.Name ?? "—",
            ["{{AccountAddressLine1}}"] = addr?.AddressLine1 ?? "",
            ["{{AccountAddressLine2}}"] = addr?.AddressLine2 ?? "",
            ["{{AccountCityLine}}"] = cityLine,
            ["{{AccountCountry}}"] = addr?.Country ?? "",
            ["{{AccountPhone}}"] = a?.Phone ?? "",
            ["{{AccountEmail}}"] = a?.Email ?? "",
            ["{{Subtotal}}"] = $"${quote.Subtotal:0.00}",
            ["{{ItemsDiscount}}"] = $"${itemsDiscount:0.00}",
            ["{{Discount}}"] = $"${quote.Discount:0.00}",
            ["{{TotalDiscount}}"] = $"${totalDiscount:0.00}",
            ["{{Tax}}"] = $"${quote.Tax:0.00}",
            ["{{Total}}"] = $"${quote.Total:0.00}",
            ["{{Notes}}"] = string.IsNullOrWhiteSpace(quote.Notes) ? "—" : quote.Notes,
        };
    }

    private static async Task<byte[]> ConvertDocxToPdfAsync(byte[] docxBytes, CancellationToken ct)
    {
        var workDir = Path.Combine(Path.GetTempPath(), "crmplus-doc-" + Guid.NewGuid());
        var profileDir = Path.Combine(workDir, "profile");
        Directory.CreateDirectory(workDir);
        Directory.CreateDirectory(profileDir);
        var docxPath = Path.Combine(workDir, "document.docx");
        var pdfPath = Path.Combine(workDir, "document.pdf");

        try
        {
            await File.WriteAllBytesAsync(docxPath, docxBytes, ct);

            var sofficePath = ResolveSofficePath();
            var psi = new ProcessStartInfo
            {
                FileName = sofficePath,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            psi.ArgumentList.Add("--headless");
            psi.ArgumentList.Add("--norestore");
            psi.ArgumentList.Add($"-env:UserInstallation=file:///{profileDir.Replace('\\', '/')}");
            psi.ArgumentList.Add("--convert-to");
            psi.ArgumentList.Add("pdf");
            psi.ArgumentList.Add("--outdir");
            psi.ArgumentList.Add(workDir);
            psi.ArgumentList.Add(docxPath);

            using var process = Process.Start(psi) ?? throw new InvalidOperationException("Failed to start soffice process.");
            await process.WaitForExitAsync(ct);

            if (!File.Exists(pdfPath))
            {
                var stderr = await process.StandardError.ReadToEndAsync(ct);
                throw new InvalidOperationException($"PDF conversion failed (exit {process.ExitCode}): {stderr}");
            }

            return await File.ReadAllBytesAsync(pdfPath, ct);
        }
        finally
        {
            try { Directory.Delete(workDir, true); } catch { /* best-effort cleanup */ }
        }
    }

    private static string ResolveSofficePath()
    {
        var candidates = new[]
        {
            @"C:\Program Files\LibreOffice\program\soffice.exe",
            @"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            "/usr/bin/soffice",
            "/usr/bin/libreoffice",
        };
        foreach (var candidate in candidates)
            if (File.Exists(candidate)) return candidate;
        return "soffice";
    }
}
