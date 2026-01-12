import { useState } from 'react';
import { 
  Bell, 
  BellOff, 
  Trash2, 
  Plane, 
  Calendar, 
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { usePriceAlerts, SavedSearch, PriceHistory } from '@/hooks/usePriceAlerts';
import { format } from 'date-fns';

interface SavedSearchesPanelProps {
  email: string;
  onSearchClick?: (search: SavedSearch) => void;
}

export function SavedSearchesPanel({ email, onSearchClick }: SavedSearchesPanelProps) {
  const { savedSearches, isLoading, toggleAlert, deleteAlert, getPriceHistory } = usePriceAlerts(email);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priceHistories, setPriceHistories] = useState<Record<string, PriceHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  const handleToggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (!priceHistories[id]) {
      setLoadingHistory(id);
      const history = await getPriceHistory(id);
      setPriceHistories(prev => ({ ...prev, [id]: history }));
      setLoadingHistory(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getPriceTrend = (history: PriceHistory[]) => {
    if (history.length < 2) return 'stable';
    const firstPrice = history[0].price;
    const lastPrice = history[history.length - 1].price;
    if (lastPrice < firstPrice * 0.95) return 'down';
    if (lastPrice > firstPrice * 1.05) return 'up';
    return 'stable';
  };

  if (isLoading && savedSearches.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (savedSearches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No saved price alerts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create an alert to get notified when prices drop
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Your Price Alerts
          <Badge variant="secondary" className="ml-auto">
            {savedSearches.filter(s => s.is_active).length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {savedSearches.map((search) => {
          const history = priceHistories[search.id] || [];
          const trend = getPriceTrend(history);
          
          return (
            <Collapsible
              key={search.id}
              open={expandedId === search.id}
              onOpenChange={() => handleToggleExpand(search.id)}
            >
              <div className={`border rounded-lg transition-colors ${
                search.is_active ? 'bg-background' : 'bg-muted/30'
              }`}>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onSearchClick?.(search)}
                    >
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {search.origin} → {search.destination}
                        </span>
                        {!search.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(search.departure_date)}
                          {search.return_date && ` - ${formatDate(search.return_date)}`}
                        </span>
                      </div>

                      {search.current_lowest_price && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm">
                            Current: <strong>AUD {search.current_lowest_price.toLocaleString()}</strong>
                          </span>
                          {trend === 'down' && (
                            <Badge variant="default" className="bg-green-500 text-xs gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Dropping
                            </Badge>
                          )}
                          {trend === 'up' && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Rising
                            </Badge>
                          )}
                          {trend === 'stable' && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Minus className="h-3 w-3" />
                              Stable
                            </Badge>
                          )}
                        </div>
                      )}

                      {search.target_price && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Alert when below: AUD {search.target_price.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={search.is_active}
                        onCheckedChange={(checked) => toggleAlert(search.id, checked)}
                        aria-label={search.is_active ? 'Pause alert' : 'Resume alert'}
                      />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedId === search.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="px-3 pb-3 border-t pt-3 space-y-3">
                    {loadingHistory === search.id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : history.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Price History</h4>
                        <div className="flex items-end gap-1 h-16">
                          {history.slice(-14).map((point, i) => {
                            const maxPrice = Math.max(...history.map(p => p.price));
                            const minPrice = Math.min(...history.map(p => p.price));
                            const range = maxPrice - minPrice || 1;
                            const height = ((point.price - minPrice) / range) * 100;
                            
                            return (
                              <div
                                key={point.id}
                                className="flex-1 bg-primary/60 hover:bg-primary transition-colors rounded-t"
                                style={{ height: `${Math.max(height, 10)}%` }}
                                title={`${format(new Date(point.recorded_at), 'MMM d')}: AUD ${point.price.toLocaleString()}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>14 days</span>
                          <span>Now</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No price history yet
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => deleteAlert(search.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Alert
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
