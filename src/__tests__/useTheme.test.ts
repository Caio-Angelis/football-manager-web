import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';
import { THEME_STORAGE_KEY } from '../utils/theme';

describe('hooks/useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-pref');
    document.documentElement.style.colorScheme = '';
  });

  it('initializes with system preference when nothing stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(['light', 'dark']).toContain(result.current.resolved);
  });

  it('initializes with stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
    expect(result.current.resolved).toBe('dark');
  });

  it('setPreference updates theme to dark', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('dark');
    });
    expect(result.current.preference).toBe('dark');
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('setPreference updates theme to light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('light');
    });
    expect(result.current.preference).toBe('light');
    expect(result.current.resolved).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('switching back to system resolves correctly', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('dark');
    });
    expect(result.current.resolved).toBe('dark');

    act(() => {
      result.current.setPreference('system');
    });
    expect(result.current.preference).toBe('system');
    expect(['light', 'dark']).toContain(result.current.resolved);
  });
});
