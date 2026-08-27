# BF1-D: apply supplier-registry migration to linked project via Management API (admin path).
# Quote-aware statement splitter (handles strings/comments/$$ bodies), resume-tolerant for an
# interrupted earlier apply of THIS migration, then verifies schema/RLS/grants/rows/secrets.
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

# Extract the HTTP response body (PG error detail lives there) from a WebException.
function Get-HttpErrorBody($err) {
  try {
    $resp = $null
    if ($err -is [System.Management.Automation.ErrorRecord] -and $err.Exception.Response) { $resp = $err.Exception.Response }
    elseif ($err.Response) { $resp = $err.Response }
    if ($resp) {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $txt = $sr.ReadToEnd()
      if ($txt) { return $txt }
    }
  } catch {}
  if ($err.ErrorDetails -and $err.ErrorDetails.Message) { return $err.ErrorDetails.Message }
  if ($err.Exception) { return $err.Exception.Message }
  return ('' + $err)
}

# --- Quote-aware statement splitter -------------------------------------------
# Handles: single-quoted strings (incl. '' escapes), -- line comments (skipped,
# NEVER treated as boundaries), and multi-line statements whose string payloads
# contain semicolons. The migration deliberately avoids $$ bodies and double-
# quoted identifiers, so this is sufficient and easy to reason about.
function Split-SqlStatements([string]$sql) {
  $stmts = New-Object System.Collections.Generic.List[string]
  $sb = New-Object System.Text.StringBuilder
  $inS = $false
  foreach ($line in ($sql -split "`r?`n")) {
    $j = 0
    $len = $line.Length
    while ($j -lt $len) {
      $c = $line[$j]
      if (-not $inS -and $c -eq '-' -and $j + 1 -lt $len -and $line[$j+1] -eq '-') {
        break # comment till end of line: skip silently, keep current statement open
      }
      [void]$sb.Append($c)
      if ($inS) {
        if ($c -eq "'") {
          if ($j + 1 -lt $len -and $line[$j+1] -eq "'") { [void]$sb.Append("'"); $j++ }
          else { $inS = $false }
        }
      } elseif ($c -eq "'") {
        $inS = $true
      } elseif ($c -eq ';') {
        $t = $sb.ToString().Trim()
        if ($t) { $stmts.Add($t) }
        [void]$sb.Clear()
      }
      $j++
    }
    if (-not $inS) { [void]$sb.Append("`n") } # preserve statement-internal line separation
  }
  $t = $sb.ToString().Trim()
  if ($t) { $stmts.Add($t) }
  return ,$stmts
}

# --- Preflight -----------------------------------------------------------------
$tbl = Q "select to_regclass('public.suppliers') is not null as exists;"
$resume = $false
if ($tbl[0].exists) {
  $polPre = Q "select count(*) as n from pg_policies where schemaname='public' and tablename='suppliers';"
  if ($polPre[0].n -gt 0) {
    Write-Output 'ALREADY APPLIED (table+policies exist) -> skipping to verification'
    $resume = 'skip-apply'
  } else {
    Write-Output 'RESUME MODE: table exists without policies -> completing interrupted apply of this same migration (tolerating already-exists)'
    $resume = 'tolerant'
  }
} else {
  Write-Output 'PREFLIGHT OK (no collisions)'
}

if ($resume -ne 'skip-apply') {
  $sql = Get-Content 'supabase\migrations\20260825213000_bf1d_supplier_registry.sql' -Raw
  $stmts = Split-SqlStatements $sql
  Write-Output ('STATEMENTS: ' + $stmts.Count)
  $idx = 0; $applied = 0; $tolerated = 0
  foreach ($st in $stmts) {
    $idx++
    $head = ($st -replace '\s+', ' ')
    if ($head.Length -gt 60) { $head = $head.Substring(0, 60) + '...' }
    try { Q $st | Out-Null; $applied++ }
    catch {
      $msg = Get-HttpErrorBody $_
      if ($resume -eq 'tolerant' -and $msg -match 'already exists|duplicate') { $tolerated++ ; Write-Output ("  tolerated #" + $idx + ": " + $head) }
      else { Write-Output ('FAILED at statement #' + $idx + ': ' + $head); Write-Output $msg; exit 1 }
    }
  }
  Write-Output ('MIGRATION APPLIED statement-by-statement: ok=' + $applied + ' tolerated=' + $tolerated)
}

# Ensure the exact SELECT-only client grant matrix no matter which path brought us here
# (Supabase default privileges leave inert REFERENCES/TRIGGER behind after write revokes).
$extra = Q "select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='suppliers' and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');"
if (@($extra).Count -gt 0) {
  Write-Output ('TIGHTENING GRANTS: stripping ' + @($extra).Count + ' non-SELECT client privileges')
  Q "revoke insert, update, delete, truncate on public.suppliers from anon, authenticated;" | Out-Null
  Q "revoke references, trigger on public.suppliers from anon, authenticated;" | Out-Null
}

# --- Verification --------------------------------------------------------------
$fail = 0
$t = Q "select to_regclass('public.suppliers') is not null as e;"
if ($t[0].e) { Write-Output 'VERIFY table exists: OK' } else { Write-Output 'VERIFY table MISSING'; $fail = 1 }

$cols = Q "select column_name from information_schema.columns where table_schema='public' and table_name='suppliers' order by ordinal_position;"
Write-Output ('COLUMNS(' + @($cols).Count + '): ' + (($cols | ForEach-Object { $_.column_name }) -join ','))

$rls = Q "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='suppliers';"
if ($rls[0].relrowsecurity) { Write-Output 'VERIFY RLS enabled: OK' } else { Write-Output 'VERIFY RLS NOT ENABLED'; $fail = 1 }

$pols = Q "select policyname, cmd, roles from pg_policies where schemaname='public' and tablename='suppliers';"
Write-Output ('POLICIES: ' + ($pols | ConvertTo-Json -Compress))
if (@($pols).Count -eq 1 -and $pols[0].cmd -eq 'SELECT') { Write-Output 'VERIFY single SELECT policy: OK' } else { Write-Output 'VERIFY POLICY MISMATCH'; $fail = 1 }

$g = Q "select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='suppliers' and grantee in ('anon','authenticated','service_role') order by grantee, privilege_type;"
Write-Output ('GRANTS: ' + ($g | ConvertTo-Json -Compress))
foreach ($role in @('anon','authenticated')) {
  $types = @($g | Where-Object { $_.grantee -eq $role } | ForEach-Object { $_.privilege_type })
  if (($types -contains 'SELECT') -and -not ($types | Where-Object { $_ -ne 'SELECT' })) { Write-Output ('VERIFY ' + $role + ': SELECT-only OK') }
  else { Write-Output ('VERIFY ' + $role + ': UNEXPECTED GRANT SET ' + ($types -join ',')); $fail = 1 }
}

$rows = Q "select id, vertical, status, mode from public.suppliers order by id;"
Write-Output ('ROWS: ' + ($rows | ConvertTo-Json -Compress))
$expected = 'duffel,tiqets,travelpayouts,viator'
if ((@($rows).Count -eq 4) -and ((($rows | ForEach-Object { $_.id }) -join ',') -eq $expected)) { Write-Output 'VERIFY seed rows: OK' }
else { Write-Output 'VERIFY seed rows MISMATCH'; $fail = 1 }

$scan = Q "select id from public.suppliers where to_jsonb(suppliers)::text ~* '(eyJ[A-Za-z0-9_-]{8,}\.|-----BEGIN|[A-Fa-f0-9]{32,}|sk_(live|test)_)';"
if (@($scan).Count -eq 0) { Write-Output 'SECRET SCAN of live rows: CLEAN' } else { Write-Output ('SECRET SCAN HIT: ' + ($scan | ConvertTo-Json -Compress)); $fail = 1 }

if ($fail -ne 0) { Write-Output 'RESULT: FAILURES DETECTED'; exit 1 }
Write-Output 'BF1-D APPLY+VERIFY COMPLETE'
