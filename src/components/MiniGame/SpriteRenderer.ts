export class SpriteRenderer {
  private readonly cache = new Map<string, HTMLImageElement>();

  async preload(paths: readonly string[]): Promise<void> {
    await Promise.all(paths.map(p => this.loadOne(p)));
  }

  private loadOne(src: string): Promise<void> {
    return new Promise(resolve => {
      if (this.cache.has(src)) { resolve(); return; }
      const img = new Image();
      img.onload  = () => { this.cache.set(src, img); resolve(); };
      img.onerror = () => resolve(); // fail silently — draw call is a no-op
      img.src = src;
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    src: string,
    x: number, y: number,
    w: number, h: number,
  ): void {
    const img = this.cache.get(src);
    if (img) ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
  }

  /** Natural pixel width of a loaded image, or fallback if not yet loaded */
  naturalWidth(src: string, fallback: number): number {
    return this.cache.get(src)?.naturalWidth ?? fallback;
  }
}
