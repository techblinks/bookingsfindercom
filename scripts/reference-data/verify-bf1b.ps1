$ErrorActionPreference = 'Continue'
$tok = (& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/reference-data/get-token.ps1)
$h = @{ Authorization = ('Bearer ' + $tok); 'Content-Type' = 'application/json' }
function Q($sql) {
  $b = @{ query = $sql } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/pjehrnhmjrxrlrhuhqgf/database/query' -Method Post -Headers $h -Body $b
}
Write-Output ('TYO=' + ((Q "select string_agg(airport_iata,',' order by rank) v from public.metro_airports where metro_code='TYO';").v))
Write-Output ('LON=' + ((Q "select string_agg(airport_iata,',' order by rank) v from public.metro_airports where metro_code='LON';").v))
Write-Output ('NYC=' + ((Q "select string_agg(airport_iata,',' order by rank) v from public.metro_airports where metro_code='NYC';").v))
$c = Q "select (select count(*) from public.countries) countries,(select count(*) from public.cities) cities,(select count(*) from public.airports) airports,(select count(*) from public.airlines) airlines,(select count(*) from public.metro_airports) metro;"
Write-Output ('COUNTS countries/cities/airports/airlines/metro = ' + $c.countries + '/' + $c.cities + '/' + $c.airports + '/' + $c.airlines + '/' + $c.metro)
$orph = Q "select (select count(*) from public.cities c left join public.countries co on co.iso2=c.country_iso2 where co.iso2 is null)+(select count(*) from public.airports a left join public.cities ci on ci.id=a.city_id where a.city_id is not null and ci.id is null)+(select count(*) from public.metro_airports m left join public.airports ap on ap.iata=m.airport_iata where ap.iata is null) n;"
Write-Output ('ORPHANS(expect 0)=' + $orph.n)
$dup = Q "select (select count(*) from (select iata from public.airports group by iata having count(*) > 1) x)+(select count(*) from (select iata from public.airlines where iata is not null group by iata having count(*) > 1) y) n;"
Write-Output ('DUP_IATA(expect 0)=' + $dup.n)
Write-Output ('CLOSED_INACTIVE=' + (Q "select count(*) n from public.airports where airport_type='closed' and is_active=false;").n)
Write-Output ('PROVENANCE_MISSING(expect 0)=' + (Q "select (select count(*) from public.countries where source is null or source='')+(select count(*) from public.cities where source is null or source='')+(select count(*) from public.airports where source is null or source='')+(select count(*) from public.airlines where source is null or source='')+(select count(*) from public.metro_airports where source is null or source='') n;").n)
# --- RLS / grants enforcement through the PUBLIC API (anon publishable key) ---
$envLines = Get-Content .env
$surl = ($envLines | Where-Object { $_ -like 'VITE_SUPABASE_URL=*' }) -replace '^VITE_SUPABASE_URL=', ''
$skey = ($envLines | Where-Object { $_ -like 'VITE_SUPABASE_PUBLISHABLE_KEY=*' }) -replace '^VITE_SUPABASE_PUBLISHABLE_KEY=', ''
$ah = @{ apikey = $skey; Authorization = ('Bearer ' + $skey) }
try {
  $r = Invoke-WebRequest -Uri ($surl + '/rest/v1/countries?select=iso2&limit=1') -Headers $ah -UseBasicParsing
  Write-Output ('RLS_READ_STATUS=' + $r.StatusCode + ' (expect 200)')
} catch { Write-Output ('RLS_READ_FAILED status=' + $_.Exception.Response.StatusCode.value__) }
try {
  $body = '{"iso2":"ZZ","iso3":"ZZZ","name":"rls-probe","source":"probe"}'
  $r2 = Invoke-WebRequest -Uri ($surl + '/rest/v1/countries') -Headers $ah -Method Post -ContentType 'application/json' -Body $body -UseBasicParsing
  Write-Output ('RLS_WRITE_UNEXPECTEDLY_OK=' + $r2.StatusCode)
} catch {
  Write-Output ('RLS_WRITE_BLOCKED status=' + $_.Exception.Response.StatusCode.value__ + ' (expect 401/403/404)')
}
