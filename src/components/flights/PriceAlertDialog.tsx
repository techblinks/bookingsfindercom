import { useState } from 'react';
import { Bell, BellRing, Mail, DollarSign, Plane, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePriceAlerts, CreateAlertParams } from '@/hooks/usePriceAlerts';
import { format } from 'date-fns';

interface PriceAlertDialogProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currentLowestPrice?: number;
  currency?: string;
  trigger?: React.ReactNode;
}

export function PriceAlertDialog({
  origin,
  destination,
  departureDate,
  returnDate,
  passengers,
  cabinClass,
  currentLowestPrice,
  currency = 'USD',
  trigger,
}: PriceAlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState<string>(
    currentLowestPrice ? Math.round(currentLowestPrice * 0.9).toString() : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createAlert } = usePriceAlerts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;

    setIsSubmitting(true);

    const params: CreateAlertParams = {
      email,
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      currentPrice: currentLowestPrice,
    };

    const result = await createAlert(params);
    
    setIsSubmitting(false);

    if (result) {
      setOpen(false);
      setEmail('');
      setTargetPrice('');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Set Price Alert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Create Price Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when prices drop for this route
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Flight Info Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{origin}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{destination}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(departureDate)}</span>
              {returnDate && (
                <>
                  <span>-</span>
                  <span>{formatDate(returnDate)}</span>
                </>
              )}
            </div>
            {currentLowestPrice && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Current lowest: </span>
                <span className="font-semibold text-primary">
                  {currency} {currentLowestPrice.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Alert Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetPrice">Target Price (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currency}
                </span>
                <Input
                  id="targetPrice"
                  type="number"
                  placeholder={currentLowestPrice ? `Below ${Math.round(currentLowestPrice * 0.9)}` : 'Any price drop'}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="pl-14"
                  min="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll notify you when the price drops{targetPrice ? ` below ${currency} ${targetPrice}` : ''}
              </p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !email}>
              <BellRing className="h-4 w-4" />
              {isSubmitting ? 'Creating Alert...' : 'Create Price Alert'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            You can unsubscribe at any time. We'll only email you about price drops.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
