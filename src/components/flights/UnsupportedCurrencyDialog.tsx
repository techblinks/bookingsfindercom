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
 * currencyApplied === false (see whiteLabelUrl.ts). Deliberately does not
 * name what currency the partner will actually show — that isn't verified
 * or deterministic, only that it won't be the requested one.
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
            BookingsFinder is showing prices in {currency}, but our live flight partner does not currently support {currency} on this White Label. Live prices may open in the partner's available/default currency.
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
