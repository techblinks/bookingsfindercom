/**
 * Phase 7D: Logo sizing — unit tests.
 *
 * Tests for: configurable logo heights, BrandLogo context prop,
 * range validation, default fallbacks.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BrandingProvider } from '@/hooks/useBranding';
import {
  DEFAULT_BRANDING,
  LOGO_HEIGHT_MIN,
  LOGO_HEIGHT_MAX,
  type BrandingSettings,
} from '@/types/branding';

// ── Mock Supabase ──────────────────────────────────────────────────

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

// ── Test Data ─────────────────────────────────────────────────────

const mockBrandingData: BrandingSettings = {
  id: 'default',
  site_name: 'BookingsFinder',
  tagline: 'Plan, Prepare, and Travel Ready',
  logo_url: 'https://cdn.test.com/logo.png',
  logo_light_url: null,
  logo_dark_url: null,
  icon_url: null,
  favicon_url: null,
  primary_color: '#0D4F5C',
  secondary_color: '#CC4D28',
  accent_color: '#2E6B4A',
  logo_height_desktop: 56,
  logo_height_mobile: 40,
  logo_height_footer: 48,
  updated_at: '2026-07-29T00:00:00.000Z',
  updated_by: null,
};

function mockBrandingLoad(data: BrandingSettings | null = mockBrandingData) {
  (supabase.from('site_branding').select('*').limit(1).maybeSingle as ReturnType<typeof vi.fn>)
    .mockResolvedValue({ data, error: null });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter><BrandingProvider>{children}</BrandingProvider></MemoryRouter>;
}

// ════════════════════════════════════════════════════════════════
// 1. Default Size Fallback
// ════════════════════════════════════════════════════════════════

describe('BrandLogo — default size fallback', () => {
  it('applies desktop height from branding', async () => {
    mockBrandingLoad();

    render(
      <Wrapper>
        <BrandLogo variant="default" context="desktop" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('56px');
      expect(img.style.width).toBe('auto');
    });
  });

  it('applies mobile height from branding', async () => {
    mockBrandingLoad();

    render(
      <Wrapper>
        <BrandLogo variant="default" context="mobile" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('40px');
    });
  });

  it('applies footer height from branding', async () => {
    mockBrandingLoad();

    render(
      <Wrapper>
        <BrandLogo variant="default" context="footer" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('48px');
    });
  });

  it('falls back to DEFAULT_BRANDING heights when no provider', () => {
    render(
      <BrandLogo variant="default" context="desktop" data-testid="logo" />,
    );

    const img = screen.getByTestId('logo');
    expect(img.style.height).toBe(`${DEFAULT_BRANDING.logo_height_desktop}px`);
  });
});

// ════════════════════════════════════════════════════════════════
// 2. Custom Size Rendering
// ════════════════════════════════════════════════════════════════

describe('BrandLogo — custom size rendering', () => {
  it('respects custom branding heights', async () => {
    const data: BrandingSettings = {
      ...mockBrandingData,
      logo_height_desktop: 72,
      logo_height_mobile: 36,
      logo_height_footer: 60,
    };
    mockBrandingLoad(data);

    render(
      <Wrapper>
        <BrandLogo variant="default" context="desktop" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('72px');
    });
  });

  it('style height applies from context even with className present', async () => {
    mockBrandingLoad();

    render(
      <Wrapper>
        <BrandLogo variant="default" context="desktop" className="h-20 w-auto" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('56px');
    });
  });

  it('no context uses className only', async () => {
    mockBrandingLoad();

    render(
      <Wrapper>
        <BrandLogo variant="default" className="h-16 w-auto" data-testid="logo" />
      </Wrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('logo');
      expect(img.style.height).toBe('');
      expect(img.className).toContain('h-16');
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 3. Validation — min/max logo heights
// ════════════════════════════════════════════════════════════════

describe('Logo height — range validation', () => {
  it('LOGO_HEIGHT_MIN is 24', () => {
    expect(LOGO_HEIGHT_MIN).toBe(24);
  });

  it('LOGO_HEIGHT_MAX is 120', () => {
    expect(LOGO_HEIGHT_MAX).toBe(120);
  });

  it('DEFAULT_BRANDING heights are within valid range', () => {
    expect(DEFAULT_BRANDING.logo_height_desktop).toBeGreaterThanOrEqual(LOGO_HEIGHT_MIN);
    expect(DEFAULT_BRANDING.logo_height_desktop).toBeLessThanOrEqual(LOGO_HEIGHT_MAX);
    expect(DEFAULT_BRANDING.logo_height_mobile).toBeGreaterThanOrEqual(LOGO_HEIGHT_MIN);
    expect(DEFAULT_BRANDING.logo_height_mobile).toBeLessThanOrEqual(LOGO_HEIGHT_MAX);
    expect(DEFAULT_BRANDING.logo_height_footer).toBeGreaterThanOrEqual(LOGO_HEIGHT_MIN);
    expect(DEFAULT_BRANDING.logo_height_footer).toBeLessThanOrEqual(LOGO_HEIGHT_MAX);
  });

  it('DEFAULT_BRANDING heights are sensible (desktop > mobile)', () => {
    expect(DEFAULT_BRANDING.logo_height_desktop).toBeGreaterThan(DEFAULT_BRANDING.logo_height_mobile);
  });

  it('all height fields are defined in defaults', () => {
    expect(DEFAULT_BRANDING.logo_height_desktop).toBe(56);
    expect(DEFAULT_BRANDING.logo_height_mobile).toBe(40);
    expect(DEFAULT_BRANDING.logo_height_footer).toBe(48);
  });
});
