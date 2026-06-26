import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredThemePreference,
  resolveTheme,
  applyTheme,
  THEME_STORAGE_KEY,
} from '../utils/theme';

describe('utils/theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-pref');
    document.documentElement.style.colorScheme = '';
  });

  describe('getStoredThemePreference', () => {
    it('returns "system" when nothing is stored', () => {
      expect(getStoredThemePreference()).toBe('system');
    });

    it('returns "dark" when localStorage has "dark"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getStoredThemePreference()).toBe('dark');
    });

    it('returns "light" when localStorage has "light"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(getStoredThemePreference()).toBe('light');
    });

    it('returns "system" when localStorage has "system"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
      expect(getStoredThemePreference()).toBe('system');
    });

    it('returns "system" for invalid stored value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'invalid-value');
      expect(getStoredThemePreference()).toBe('system');
    });

    it('returns "system" when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage blocked');
      });
      expect(getStoredThemePreference()).toBe('system');
      spy.mockRestore();
    });
  });

  describe('resolveTheme', () => {
    it('returns "light" for light preference', () => {
      expect(resolveTheme('light')).toBe('light');
    });

    it('returns "dark" for dark preference', () => {
      expect(resolveTheme('dark')).toBe('dark');
    });

    it('returns based on matchMedia for system preference', () => {
      // happy-dom defaults to not matching dark
      const result = resolveTheme('system');
      expect(['light', 'dark']).toContain(result);
    });
  });

  describe('applyTheme', () => {
    it('applies dark theme to document and stores in localStorage', () => {
      const resolved = applyTheme('dark');
      expect(resolved).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(document.documentElement.dataset.themePref).toBe('dark');
      expect(document.documentElement.style.colorScheme).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('applies light theme to document and stores in localStorage', () => {
      const resolved = applyTheme('light');
      expect(resolved).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(document.documentElement.dataset.themePref).toBe('light');
      expect(document.documentElement.style.colorScheme).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('applies system theme and stores "system" in localStorage', () => {
      const resolved = applyTheme('system');
      expect(['light', 'dark']).toContain(resolved);
      expect(document.documentElement.dataset.themePref).toBe('system');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    });

    it('handles localStorage setItem failure gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      // Should not throw
      const resolved = applyTheme('dark');
      expect(resolved).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      spy.mockRestore();
    });
  });
});
