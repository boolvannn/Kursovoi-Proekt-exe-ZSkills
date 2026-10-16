using System.Text.RegularExpressions;

namespace DiplomLauncher;

/// <summary>Чтение и точечное обновление .env без потери остальных строк.</summary>
public static class EnvFile
{
    public static Dictionary<string, string> Read(string path)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(path))
            return dict;

        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#') || !line.Contains('='))
                continue;

            var idx = line.IndexOf('=');
            var key = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim();
            dict[key] = Unquote(value);
        }

        return dict;
    }

    private static string Unquote(string value)
    {
        if (value.Length >= 2 &&
            ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\'')))
            return value[1..^1];
        return value;
    }

    private static string Format(string value)
    {
        if (Regex.IsMatch(value, @"[\s#]"))
            return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
        return value;
    }

    public static void Update(string path, Dictionary<string, string> updates)
    {
        var lines = File.Exists(path)
            ? new List<string>(File.ReadAllLines(path))
            : new List<string>();

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var trimmed = line.TrimStart();
            if (trimmed.Length == 0 || trimmed.StartsWith('#') || !line.Contains('='))
                continue;

            var idx = line.IndexOf('=');
            var key = line[..idx].Trim();
            if (updates.TryGetValue(key, out var value))
            {
                lines[i] = $"{key}={Format(value)}";
                seen.Add(key);
            }
        }

        var missing = updates.Keys.Where(k => !seen.Contains(k)).ToList();
        if (missing.Count > 0)
        {
            if (lines.Count > 0 && !string.IsNullOrWhiteSpace(lines[^1]))
                lines.Add(string.Empty);
            lines.Add("# Settings managed by launcher");
            foreach (var key in missing)
                lines.Add($"{key}={Format(updates[key])}");
        }

        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        File.WriteAllLines(path, lines);
    }
}
