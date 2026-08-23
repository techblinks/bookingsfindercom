import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnsupportedCurrencyDialogProps {
  open: boolean;
  /** The resolved currency that could not be preserved on the White Label — never a claimed fallback. */
  currency: string | null;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

/**
 * BF-FLIGHTS-LIVE-2 Round 2 Phase C — shown before redirecting to the White
 * Label whenever buildWhiteLabelFlightUrl reports requestedCurrency set but
 * currencyApplied === false (see whiteLabelUrl.ts).
 *
 * Round 3 Phase B: `currencyApplied === false` covers two different facts —
 * a currency Round 1 live-verified the White Label does NOT apply (INR,
 * JPY, SGD) and a currency that was simply never tested (AED, THB, and
 * anything else BookingsFinder's own geo/selector can resolve). The wording
 * below is deliberately the single generic truth that holds for both: it
 * says preservation cannot currently be guaranteed, not that the currency
 * is confirmed unsupported — and it never names what currency the partner
 * will actually show (not verified/deterministic) or any fallback currency
 * by name.
 *
 * Cancelling closes the dialog with no redirect and no tracking call — the
 * search state behind it is untouched, since nothing about the search
 * itself changes here.
 */
const UnsupportedCurrencyDialog = ({ open, currency, onOpenChange, onContinue }: UnsupportedCurrencyDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Live partner currency differs</AlertDialogTitle>
          <AlertDialogDescription>
            BookingsFinder is showing prices in {currency}, but we cannot currently guarantee that our live flight partner will preserve {currency}. Live prices may open in another available currency.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>Continue to Live Flights</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsupportedCurrencyDialog;
