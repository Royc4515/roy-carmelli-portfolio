import { renderHook } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useInertWhile } from './useInertWhile';

describe('useInertWhile', () => {
  const made: HTMLElement[] = [];
  function el(inert = false) {
    const node = document.createElement('div');
    if (inert) node.setAttribute('inert', '');
    document.body.append(node);
    made.push(node);
    return node;
  }
  afterEach(() => made.splice(0).forEach(node => node.remove()));

  it('makes the selected elements inert while active and restores them after', () => {
    const a = el();
    const b = el();
    const { rerender } = renderHook(({ on }) => useInertWhile(on, () => [a, b]), { initialProps: { on: false } });
    expect(a).not.toHaveAttribute('inert');
    rerender({ on: true });
    expect(a).toHaveAttribute('inert');
    expect(b).toHaveAttribute('inert');
    rerender({ on: false });
    expect(a).not.toHaveAttribute('inert');
    expect(b).not.toHaveAttribute('inert');
  });

  it('leaves alone what was inert already, and cleans up on unmount', () => {
    const before = el(true);
    const other = el();
    const { unmount } = renderHook(() => useInertWhile(true, () => [before, other]));
    expect(other).toHaveAttribute('inert');
    unmount();
    expect(other).not.toHaveAttribute('inert');
    expect(before).toHaveAttribute('inert');
  });

  it('lets two overlays overlap: each restores only its own', () => {
    const shared = el();
    const menuOnly = el();
    const menu = renderHook(({ on }) => useInertWhile(on, () => [shared, menuOnly]), { initialProps: { on: true } });
    const game = renderHook(({ on }) => useInertWhile(on, () => [shared]), { initialProps: { on: true } });
    game.rerender({ on: false });
    expect(shared).toHaveAttribute('inert');
    menu.rerender({ on: false });
    expect(shared).not.toHaveAttribute('inert');
    expect(menuOnly).not.toHaveAttribute('inert');
  });
});
