import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SavedSearch } from '@/hooks/usePriceAlerts';

interface SavedSearchesPanelProps {
  email: string;
  onSearchClick?: (search: SavedSearch) => void;
}

// BF-0R-5 round 3: viewing, pausing/resuming, and deleting existing alerts
// (and the price-history chart) are temporarily unavailable. anon/
// authenticated have no SELECT/UPDATE/DELETE privilege on saved_searches or
// price_history at all — a per-alert email-lookup flow had no trustworthy
// ownership mechanism (email is not authorization) and was closed rather
// than left publicly enumerable. Creating a NEW alert is unaffected — see
// PriceAlertDialog.tsx / usePriceAlerts.createAlert. `email`/`onSearchClick`
// are kept in the props for interface stability with MyAlerts.tsx but are
// intentionally unused here.
export function SavedSearchesPanel(_props: SavedSearchesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Alert Management Temporarily Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          We're upgrading how saved price alerts are secured. Viewing, pausing,
          or deleting existing alerts isn't available right now, but you can
          still create new price alerts below.
        </p>
      </CardContent>
    </Card>
  );
}
