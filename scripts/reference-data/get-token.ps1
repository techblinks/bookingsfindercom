# Prints the Supabase CLI access token (stdout only; never logged by callers)
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
$s = [CredMan]::ReadSecret('Supabase CLI:supabase')
if (-not $s) { Write-Output 'TOKEN_READ_FAILED'; exit 1 }
[Console]::Out.Write($s)
