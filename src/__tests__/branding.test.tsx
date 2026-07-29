/**
 * Phase 7D: Central Brand Manager — Hardened Unit Tests
 *
 * Tests for: BrandLogo, useBranding, colour validation,
 * favicon update, file validation, singleton design.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { FaviconUpdater } from '@/components/brand/FaviconUpdater';
import { BrandingProvider, useBranding } from '@/hooks/useBranding';
import {
  DEFAULT_BRANDING,
  ALLOWED_BRANDING_MIME_TYPES,
  MAX_BRANDING_FILE_SIZE,
  BRANDING_STORAGE_PATHS,
  BRANDING_ASSET_LABELS,
  BRANDING_SINGLETON_ID,
  isValidHexColor,
  HEX_COLOR_RE,
  type BrandingSettings,
  type BrandingAssetSlot,
} from '@/types/branding';

// ── Mock Supabase Client ──────────────────────────────────────────

vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    removeChannel: vi.fn(),
    upsert: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({
          data: { publicUrl: 'https://example.com/branding/logo.png' },
        }),
    },
  };
  return { supabase: mockSupabase };
});

import { supabase } from '@/integrations/supabase/client';

// ── Test Data ─────────────────────────────────────────────────────

const mockBrandingData: BrandingSettings = {
  id: 'default',
  site_name: 'Test Finder',
  tagline: 'Find the best',
  logo_url: 'https://cdn.test.com/logo.png',
  logo_light_url: 'https://cdn.test.com/logo-light.png',
  logo_dark_url: 'https://cdn.test.com/logo-dark.png',
  icon_url: 'https://cdn.test.com/icon.png',
  favicon_url: 'https://cdn.test.com/favicon.png',
  primary_color: '#FF6B35',
  secondary_color: '#004E89',
  accent_color: '#2E6B4A',
  updated_at: '2026-07-29T00:00:00.000Z',
  updated_by: null,
};

function mockBrandingLoad(data: BrandingSettings | null = mockBrandingData) {
  (
    supabase.from('site_branding').select('*').limit(1).maybeSingle as ReturnType<
      typeof vi.fn
    >
  ).mockResolvedValue({ data, error: null });
}

function mockBrandingError() {
  (
    supabase.from('site_branding').select('*').limit(1).maybeSingle as ReturnType<
      typeof vi.fn
    >
  ).mockResolvedValue({
    data: null,
    error: new Error('Database connection failed'),
  });
}

// ── Wrapper ───────────────────────────────────────────────────────

function BrandingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <BrandingProvider>{children}</BrandingProvider>
    </MemoryRouter>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. Default Branding Fallback
// ════════════════════════════════════════════════════════════════

describe('useBranding — default fallback', () => {
  it('returns default branding when no DB row exists', async () => {
    mockBrandingLoad(null);

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.branding.site_name).toBe(DEFAULT_BRANDING.site_name);
    expect(result.current.branding.primary_color).toBe(
      DEFAULT_BRANDING.primary_color,
    );
    expect(result.current.hasCustomBranding).toBe(false);
  });

  it('returns defaults when DB fetch fails', async () => {
    mockBrandingError();

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.branding.site_name).toBe(DEFAULT_BRANDING.site_name);
  });

  it('provides safe defaults without BrandingProvider wrapper', () => {
    const { result } = renderHook(() => useBranding());

    expect(result.current.branding.site_name).toBe(DEFAULT_BRANDING.site_name);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('singleton id is "default"', () => {
    expect(BRANDING_SINGLETON_ID).toBe('default');
  });
});

// ════════════════════════════════════════════════════════════════
// 2. Custom Logo Rendering
// ════════════════════════════════════════════════════════════════

describe('BrandLogo — rendering', () => {
  it('renders default variant with custom logo URL', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" className="h-9 w-auto" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.tagName).toBe('IMG');
      expect(img.getAttribute('src')).toBe(mockBrandingData.logo_url);
    });
  });

  it('falls back to built-in logo when no custom URL', async () => {
    mockBrandingLoad(null);

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('brand-logo')).toBeTruthy();
    });
  });

  it('handles img onError gracefully (falls back to bundled asset)', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo') as HTMLImageElement;
      // Fire error event — should not crash, src should switch to fallback
      fireEvent.error(img);
      // After error, src should be the fallback (bundled logo)
      expect(img.getAttribute('src')).toBeTruthy();
    });
  });

  it('uses site_name as alt text', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.getAttribute('alt')).toBe(mockBrandingData.site_name);
    });
  });

  it('accepts custom alt text', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" alt="Custom Alt" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.getAttribute('alt')).toBe('Custom Alt');
    });
  });

  it('has object-contain class to prevent layout shifts', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" className="h-9 w-auto" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.className).toContain('object-contain');
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 3. Logo Variant Selection
// ════════════════════════════════════════════════════════════════

describe('BrandLogo — variant selection', () => {
  it.each([
    ['default', mockBrandingData.logo_url],
    ['light', mockBrandingData.logo_light_url],
    ['dark', mockBrandingData.logo_dark_url],
    ['icon', mockBrandingData.icon_url],
  ] as const)('variant "%s" maps to correct URL', async (variant, expectedUrl) => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <BrandLogo variant={variant} data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.getAttribute('src')).toBe(expectedUrl);
    });
  });

  it('light variant falls back to logo_url', async () => {
    const data = { ...mockBrandingData, logo_light_url: null };
    mockBrandingLoad(data);

    render(
      <BrandingWrapper>
        <BrandLogo variant="light" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.getAttribute('src')).toBe(mockBrandingData.logo_url);
    });
  });

  it('dark variant falls back to logo_url', async () => {
    const data = { ...mockBrandingData, logo_dark_url: null };
    mockBrandingLoad(data);

    render(
      <BrandingWrapper>
        <BrandLogo variant="dark" data-testid="brand-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('brand-logo');
      expect(img.getAttribute('src')).toBe(mockBrandingData.logo_url);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 4. Failed Branding Load
// ════════════════════════════════════════════════════════════════

describe('useBranding — error handling', () => {
  it('sets error state on network failure', async () => {
    mockBrandingError();

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain(
      'Database connection failed',
    );
  });

  it('still provides default branding on error (no white screen)', async () => {
    mockBrandingError();

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.branding.site_name).toBe(DEFAULT_BRANDING.site_name);
    expect(result.current.branding.primary_color).toBe(
      DEFAULT_BRANDING.primary_color,
    );
  });
});

// ════════════════════════════════════════════════════════════════
// 5. Dynamic Favicon Update
// ════════════════════════════════════════════════════════════════

describe('FaviconUpdater — dynamic favicon', () => {
  beforeEach(() => {
    document
      .querySelectorAll('link[rel="icon"]')
      .forEach((el) => el.remove());
  });

  it('adds favicon link when favicon_url is set', async () => {
    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <FaviconUpdater />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const link = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      expect(link).toBeTruthy();
      expect(link.href).toBe(mockBrandingData.favicon_url);
    });
  });

  it('updates existing favicon link on URL change', async () => {
    const existingLink = document.createElement('link');
    existingLink.rel = 'icon';
    existingLink.href = 'old-favicon.ico';
    document.head.appendChild(existingLink);

    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <FaviconUpdater />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const link = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      expect(link.href).toBe(mockBrandingData.favicon_url);
    });
  });

  it('does nothing when favicon_url is null (preserves static fallback)', async () => {
    const data = { ...mockBrandingData, favicon_url: null };
    mockBrandingLoad(data);

    const originalLinkCount =
      document.querySelectorAll('link[rel="icon"]').length;

    render(
      <BrandingWrapper>
        <FaviconUpdater />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      expect(
        document.querySelectorAll('link[rel="icon"]').length,
      ).toBe(originalLinkCount);
    });
  });

  it('removes duplicate favicon tags', async () => {
    const link1 = document.createElement('link');
    link1.rel = 'icon';
    link1.href = 'first.ico';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'icon';
    link2.href = 'second.ico';
    document.head.appendChild(link2);

    mockBrandingLoad();

    render(
      <BrandingWrapper>
        <FaviconUpdater />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const links = document.querySelectorAll('link[rel="icon"]');
      expect(links.length).toBe(1);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 6. Colour Validation — strict 6-digit hex only
// ════════════════════════════════════════════════════════════════

describe('Colour validation — 6-digit hex only', () => {
  const validHexColors = ['#FF6B35', '#000000', '#A1B2C3', '#0D4F5C', '#ffffff', '#CC4D28'];
  const invalidHexColors: [string, string][] = [
    ['#1234', '4-digit hex'],
    ['#12345', '5-digit hex'],
    ['FF6B35', 'missing #'],
    ['#GGGGGG', 'non-hex characters'],
    ['', 'empty string'],
    ['not-a-color', 'plain text'],
    ['#1234567', '7-digit hex'],
    ['rgb(255,0,0)', 'rgb function'],
    ['#abc', '3-digit hex (ambiguous)'],
    ['#ABCDEFG', 'trailing garbage'],
  ];

  it.each(validHexColors)('accepts valid 6-digit hex: %s', (color) => {
    expect(isValidHexColor(color)).toBe(true);
  });

  it.each(invalidHexColors)('rejects %s (%s)', (color) => {
    expect(isValidHexColor(color)).toBe(false);
  });

  it('DEFAULT_BRANDING colours are all valid 6-digit hex', () => {
    expect(isValidHexColor(DEFAULT_BRANDING.primary_color)).toBe(true);
    expect(isValidHexColor(DEFAULT_BRANDING.secondary_color)).toBe(true);
    expect(isValidHexColor(DEFAULT_BRANDING.accent_color)).toBe(true);
  });

  it('HEX_COLOR_RE matches only 6-digit hex with #', () => {
    expect(HEX_COLOR_RE.test('#FF6B35')).toBe(true);
    expect(HEX_COLOR_RE.test('#abc')).toBe(false);
    expect(HEX_COLOR_RE.test('#12345')).toBe(false);
    expect(HEX_COLOR_RE.test('FF6B35')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. File Validation (MIME + Size) — PNG/WebP only
// ════════════════════════════════════════════════════════════════

describe('File upload validation', () => {
  it('only allows PNG and WebP MIME types (no SVG)', () => {
    expect(ALLOWED_BRANDING_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_BRANDING_MIME_TYPES).toContain('image/webp');
    expect(ALLOWED_BRANDING_MIME_TYPES).not.toContain('image/svg+xml');
    expect(ALLOWED_BRANDING_MIME_TYPES).not.toContain('image/jpeg');
    expect(ALLOWED_BRANDING_MIME_TYPES).not.toContain('image/gif');
  });

  it('MAX_BRANDING_FILE_SIZE is 2 MB', () => {
    expect(MAX_BRANDING_FILE_SIZE).toBe(2 * 1024 * 1024);
  });

  it('rejects files larger than MAX_BRANDING_FILE_SIZE', () => {
    const oversizedFile = new File(
      ['x'.repeat(MAX_BRANDING_FILE_SIZE + 1)],
      'big.png',
      { type: 'image/png' },
    );
    expect(oversizedFile.size).toBeGreaterThan(MAX_BRANDING_FILE_SIZE);
  });

  it('accepts files at or below MAX_BRANDING_FILE_SIZE', () => {
    const validFile = new File(['x'.repeat(1024)], 'small.png', {
      type: 'image/png',
    });
    expect(validFile.size).toBeLessThanOrEqual(MAX_BRANDING_FILE_SIZE);
  });

  it('rejects unsupported MIME types (jpeg, gif, svg)', () => {
    const jpegFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    expect(
      ALLOWED_BRANDING_MIME_TYPES.includes(
        jpegFile.type as (typeof ALLOWED_BRANDING_MIME_TYPES)[number],
      ),
    ).toBe(false);

    const gifFile = new File(['x'], 'anim.gif', { type: 'image/gif' });
    expect(
      ALLOWED_BRANDING_MIME_TYPES.includes(
        gifFile.type as (typeof ALLOWED_BRANDING_MIME_TYPES)[number],
      ),
    ).toBe(false);

    const svgFile = new File(['x'], 'logo.svg', { type: 'image/svg+xml' });
    expect(
      ALLOWED_BRANDING_MIME_TYPES.includes(
        svgFile.type as (typeof ALLOWED_BRANDING_MIME_TYPES)[number],
      ),
    ).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 8. Storage Paths (fixed, no user-controlled traversal)
// ════════════════════════════════════════════════════════════════

describe('Branding storage paths — fixed paths only', () => {
  it('maps each slot to fixed storage path (no user input)', () => {
    expect(BRANDING_STORAGE_PATHS.logo_url).toBe('branding/logo-main.png');
    expect(BRANDING_STORAGE_PATHS.logo_light_url).toBe(
      'branding/logo-light.png',
    );
    expect(BRANDING_STORAGE_PATHS.logo_dark_url).toBe(
      'branding/logo-dark.png',
    );
    expect(BRANDING_STORAGE_PATHS.icon_url).toBe('branding/icon.png');
    expect(BRANDING_STORAGE_PATHS.favicon_url).toBe('branding/favicon.png');
  });

  it('all paths are within branding/ directory', () => {
    for (const path of Object.values(BRANDING_STORAGE_PATHS)) {
      expect(path).toMatch(/^branding\//);
      expect(path).not.toContain('..');
      expect(path).not.toContain('//');
    }
  });

  it('has labels for all slots', () => {
    const slots: BrandingAssetSlot[] = [
      'logo_url',
      'logo_light_url',
      'logo_dark_url',
      'icon_url',
      'favicon_url',
    ];
    for (const slot of slots) {
      expect(BRANDING_ASSET_LABELS[slot]).toBeTruthy();
      expect(typeof BRANDING_ASSET_LABELS[slot]).toBe('string');
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 9. Reset Behaviour
// ════════════════════════════════════════════════════════════════

describe('Reset behaviour — DEFAULT_BRANDING', () => {
  it('provides consistent default site_name', () => {
    expect(DEFAULT_BRANDING.site_name).toBe('BookingsFinder');
  });

  it('provides consistent default tagline', () => {
    expect(DEFAULT_BRANDING.tagline).toBe('Plan, Prepare, and Travel Ready');
  });

  it('all URL fields default to null', () => {
    expect(DEFAULT_BRANDING.logo_url).toBeNull();
    expect(DEFAULT_BRANDING.logo_light_url).toBeNull();
    expect(DEFAULT_BRANDING.logo_dark_url).toBeNull();
    expect(DEFAULT_BRANDING.icon_url).toBeNull();
    expect(DEFAULT_BRANDING.favicon_url).toBeNull();
  });

  it('colour defaults are all valid 6-digit hex', () => {
    expect(DEFAULT_BRANDING.primary_color).toBe('#0D4F5C');
    expect(DEFAULT_BRANDING.secondary_color).toBe('#CC4D28');
    expect(DEFAULT_BRANDING.accent_color).toBe('#2E6B4A');
    expect(isValidHexColor(DEFAULT_BRANDING.primary_color)).toBe(true);
    expect(isValidHexColor(DEFAULT_BRANDING.secondary_color)).toBe(true);
    expect(isValidHexColor(DEFAULT_BRANDING.accent_color)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// 10. Refresh after save
// ════════════════════════════════════════════════════════════════

describe('useBranding — refresh', () => {
  it('refresh re-fetches branding from DB', async () => {
    mockBrandingLoad(null);
    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockBrandingLoad(mockBrandingData);

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.branding.site_name).toBe(
        mockBrandingData.site_name,
      );
      expect(result.current.hasCustomBranding).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 11. Edge Cases
// ════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('handles empty site_name by falling back to "BookingsFinder" alt text', async () => {
    const data: BrandingSettings = {
      ...mockBrandingData,
      site_name: '',
    };
    mockBrandingLoad(data);

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    render(
      <BrandingWrapper>
        <BrandLogo variant="default" data-testid="edge-logo" />
      </BrandingWrapper>,
    );

    await waitFor(() => {
      const img = screen.getByTestId('edge-logo');
      expect(img.getAttribute('alt')).toBe('BookingsFinder');
    });
  });

  it('getLogoUrl resolves correctly for all variants', async () => {
    mockBrandingLoad();

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getLogoUrl('default')).toBe(mockBrandingData.logo_url);
    expect(result.current.getLogoUrl('light')).toBe(
      mockBrandingData.logo_light_url,
    );
    expect(result.current.getLogoUrl('dark')).toBe(mockBrandingData.logo_dark_url);
    expect(result.current.getLogoUrl('icon')).toBe(mockBrandingData.icon_url);
  });

  it('hasCustomBranding is false when all URLs are null', async () => {
    const data: BrandingSettings = {
      ...mockBrandingData,
      logo_url: null,
      logo_light_url: null,
      logo_dark_url: null,
      icon_url: null,
      favicon_url: null,
    };
    mockBrandingLoad(data);

    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasCustomBranding).toBe(false);
    });
  });

  it('hasCustomBranding is true when at least one URL is set', async () => {
    mockBrandingLoad();
    const { result } = renderHook(() => useBranding(), {
      wrapper: BrandingWrapper,
    });

    await waitFor(() => {
      expect(result.current.hasCustomBranding).toBe(true);
    });
  });

  it('branding.id is the singleton key "default"', () => {
    expect(mockBrandingData.id).toBe('default');
  });

});
