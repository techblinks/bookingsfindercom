/**
 * BrandColourEditor — colour picker + hex input for a single brand colour.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { isValidHexColor } from '@/types/branding';

interface BrandColourEditorProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

export function BrandColourEditor({
  label,
  description,
  value,
  onChange,
  id,
}: BrandColourEditorProps) {
  const valid = isValidHexColor(value);

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
      {/* Colour swatch */}
      <div
        className="w-14 h-14 rounded-xl border-2 border-border shrink-0 shadow-sm"
        style={{ backgroundColor: valid ? value : '#ccc' }}
      />
      <div className="flex-1 space-y-2">
        <Label htmlFor={`color-${id}`} className="font-semibold">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              id={`color-${id}`}
              type="color"
              value={valid ? value : '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-9 p-0.5 cursor-pointer"
            />
          </div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#FF6B35"
            className="w-28 font-mono text-sm"
          />
          {!valid && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Invalid hex
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
