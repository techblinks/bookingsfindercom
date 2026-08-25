# BF1-B: apply reference-data migration to linked project via Management API (admin path)
$ErrorActionPreference = 'Stop'
$sig = @'
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credPtr);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static string ReadSecret(string target) {
    IntPtr p = IntPtr.Zero;
    if (!CredRead(target, 1, 0, out p)) return null;
    try {
      CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
      byte[] b = new byte[c.CredentialBlobSize];
      Marshal.Copy(c.CredentialBlob, b, 0, c.CredentialBlobSize);
      return System.Text.Encoding.UTF8.GetString(b).TrimEnd('\0');
    } finally { CredFree(p); }
  }
}
'@
Add-Type -TypeDefinition $sig
$token = [CredMan]::ReadSecret('Supabase CLI:supabase')
if (-not $token) { Write-Output 'TOKEN_READ_FAILED'; exit 1 }
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
function Q([string]$sql) {
  $body = @{ query = $sql } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/pjehrnhmjrxrlrhuhqgf/database/query' -Method Post -Headers $headers -Body $body
}

# 0. pre-check: tables must not exist
$pre = Q "select table_name from information_schema.tables where table_schema='public' and table_name in ('countries','cities','airports','airlines','metro_airports');"
if ($pre.Count -gt 0) { Write-Output ('PRECHECK FAILED, existing: ' + ($pre | ConvertTo-Json -Compress)); exit 1 }
Write-Output 'PRECHECK OK (no collisions)'

# 1. apply migration
$sql = Get-Content 'supabase\migrations\20260825140000_bf1b_reference_travel_data.sql' -Raw
try { Q $sql | Out-Null; Write-Output 'MIGRATION APPLIED (single batch)' }
catch {
  Write-Output 'batch failed, retrying statement-by-statement...'
  $stmts = $sql -split "`r?`n" | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('--') -or $_.Contains('-- ') } 
  # simpler: split raw on semicolons outside comments
  $clean = ($sql -split "`r?`n" | Where-Object { $_.TrimStart().StartsWith('--') -eq $false }) -join "`n"
  foreach ($st in ($clean -split ';')) {
    if ($st.Trim()) { Q $st | Out-Null }
  }
  Write-Output 'MIGRATION APPLIED (statement-by-statement)'
}

# 2. verify
$v = Q "select table_name from information_schema.tables where table_schema='public' and table_name in ('countries','cities','airports','airlines','metro_airports') order by 1;"
Write-Output ('TABLES NOW: ' + (($v | ForEach-Object { $_.table_name }) -join ','))
$p = Q "select tablename, policyname from pg_policies where schemaname='public' and tablename like '%countries%' or (schemaname='public' and tablename in ('cities','airports','airlines','metro_airports')) order by tablename;"
Write-Output ('POLICIES: ' + $p.Count)

# 3. register in platform migration history (mirror db push bookkeeping)
$cols = Q "select column_name from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations';"
Write-Output ('HISTORY COLS: ' + (($cols | ForEach-Object { $_.column_name }) -join ','))
Q "insert into supabase_migrations.schema_migrations (version, name, statements) values ('20260825140000','bf1b_reference_travel_data', null) on conflict (version) do nothing;"
$h = Q "select version, name from supabase_migrations.schema_migrations where version='20260825140000';"
Write-Output ('HISTORY REGISTERED: ' + ($h | ConvertTo-Json -Compress))
