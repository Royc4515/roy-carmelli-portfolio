/**
 * The particle field: a point cloud whose every particle travels between two sampled shapes.
 * All motion is computed in the vertex shader from a handful of uniforms, so 60,000 particles
 * cost one draw call and no per-frame JavaScript work. Raw WebGL2; no library.
 */

export type Rgb = [number, number, number];
export interface Palette {
  a: Rgb;
  b: Rgb;
}

export interface FieldState {
  /** Index of the shape the particles come from and go to, and how far along (0 to 1). */
  from: number;
  to: number;
  t: number;
  /** Where the shape sits in the view, in world units (y in [-1, 1], x in [-aspect, aspect]). */
  x: number;
  y: number;
  scale: number;
}

const VERT = `#version 300 es
precision highp float;
in vec3 aFrom;
in vec3 aTo;
in vec4 aSeed;
uniform float uT;
uniform float uTime;
uniform float uIntro;
uniform float uMotion;
uniform float uAspect;
uniform float uPx;
uniform float uScale;
uniform vec2 uOffset;
uniform vec2 uTilt;
uniform vec3 uPointer; // xy in world units, z = strength
uniform vec3 uBurst;   // xy in world units, z = age in seconds (negative: none)
out float vSeed;
out float vT;
out float vHot;
out float vMid;

// A cheap divergence-free-looking flow: enough to make particles swirl instead of slide.
vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 3.1 + t) + sin(p.z * 2.3 + t * 1.3),
    sin(p.z * 2.7 + t * 1.1) + sin(p.x * 3.3 + t * 0.7),
    sin(p.x * 2.9 + t * 0.9) + sin(p.y * 2.1 + t * 1.7));
}

void main() {
  // Each particle leaves at its own moment, so a morph reads as a wave, not a cross-fade.
  float delay = aSeed.x * 0.42;
  float t = smoothstep(delay, delay + 0.58, uT);
  float mid = sin(3.14159265 * t);
  vec3 p = mix(aFrom, aTo, t);
  p += flow(p * 1.2 + aSeed.yzw * 6.0, uTime * 0.22) * (0.62 * mid);
  p.z += mid * (aSeed.y - 0.5) * 1.6;
  p += flow(p * 4.0 + aSeed.zwy * 9.0, uTime * 0.55) * (0.007 * uMotion);

  // Intro: the cloud starts as a slowly turning sphere and condenses into the first shape.
  vec3 shell = normalize(aSeed.yzw - 0.5) * (1.5 + aSeed.x * 1.4);
  float ca = cos(uTime * 0.25 + aSeed.x), sa = sin(uTime * 0.25 + aSeed.x);
  shell.xz = mat2(ca, -sa, sa, ca) * shell.xz;
  float it = smoothstep(aSeed.w * 0.55, aSeed.w * 0.55 + 0.45, uIntro);
  p = mix(shell / max(uScale, 0.001), p, it);

  p *= uScale;
  // Tilt with the pointer: rotate around Y, then X.
  float cy = cos(uTilt.x), sy = sin(uTilt.x);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cx = cos(uTilt.y), sx = sin(uTilt.y);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  p.xy += uOffset;

  float hot = 0.0;
  // The pointer pushes particles away and curls them around itself.
  vec2 d = p.xy - uPointer.xy;
  float dist = length(d) + 1e-4;
  float push = uPointer.z * exp(-dist * dist / 0.035);
  p.xy += (d / dist) * push * 0.2 + vec2(-d.y, d.x) / dist * push * 0.1;
  hot += push;
  // A tap sends out a ring.
  if (uBurst.z >= 0.0) {
    vec2 bd = p.xy - uBurst.xy;
    float bl = length(bd) + 1e-4;
    float ring = exp(-pow((bl - uBurst.z * 1.9) / 0.13, 2.0)) * max(0.0, 1.0 - uBurst.z / 1.1);
    p.xy += (bd / bl) * ring * 0.22;
    p.z += ring * 0.25;
    hot += ring;
  }

  float depth = 3.0 - p.z;
  gl_Position = vec4(p.x * 3.0 / depth / uAspect, p.y * 3.0 / depth, 0.0, 1.0);
  gl_PointSize = uPx * (0.55 + aSeed.w * 1.15) * (3.0 / depth) * (1.0 + mid * 0.9 + hot * 1.5);
  vSeed = aSeed.z;
  vT = t;
  vHot = hot + mid * 0.2;
  vMid = mid;
}`;

// don't touch / highp here too: uTime and uMotion are shared with the vertex shader, and a
// uniform declared with two precisions fails to link.
const FRAG = `#version 300 es
precision highp float;
in float vSeed;
in float vT;
in float vHot;
in float vMid;
uniform vec3 uFromA;
uniform vec3 uFromB;
uniform vec3 uToA;
uniform vec3 uToB;
uniform float uTime;
uniform float uMotion;
uniform float uAlpha;
uniform float uGlow; // 1 on the dark ground (additive light), 0 on the light one (ink)
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  a *= a;
  vec3 col = mix(mix(uFromA, uFromB, vSeed), mix(uToA, uToB, vSeed), vT);
  float twinkle = 0.78 + 0.22 * sin(uTime * (1.5 + vSeed * 4.0) + vSeed * 40.0) * uMotion;
  col = mix(col, vec3(1.0), clamp(vHot, 0.0, 1.0) * 0.55 * uGlow);
  // In flight the particles of two shapes overlap near the middle: thin them out there.
  outColor = vec4(col * twinkle, a * uAlpha * mix(1.0, 0.42, vMid));
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.env.DEV) console.error('particle shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class ParticleField {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private shapeBuffers: WebGLBuffer[] = [];
  private seedBuffer: WebGLBuffer;
  private palettes: Palette[] = [];
  private count: number;
  /** How many of the particles are drawn: lowered when frames are slow. */
  private drawCount: number;
  private aFrom: number;
  private aTo: number;
  private bound: [number, number] = [-1, -1];
  private dpr = 1;
  private dark = true;
  private burst = { x: 0, y: 0, start: -1 };

  /** Returns null when WebGL2 is not available: the page then shows its static fallback. */
  static create(canvas: HTMLCanvasElement, count: number): ParticleField | null {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (import.meta.env.DEV) console.error('particle program:', gl.getProgramInfoLog(program));
      return null;
    }
    return new ParticleField(canvas, gl, program, count);
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    count: number,
  ) {
    this.gl = gl;
    this.program = program;
    this.count = count;
    this.drawCount = count;
    gl.useProgram(program);
    for (const name of [
      'uT', 'uTime', 'uIntro', 'uMotion', 'uAspect', 'uPx', 'uScale', 'uOffset', 'uTilt', 'uPointer',
      'uBurst', 'uFromA', 'uFromB', 'uToA', 'uToB', 'uAlpha', 'uGlow',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    this.aFrom = gl.getAttribLocation(program, 'aFrom');
    this.aTo = gl.getAttribLocation(program, 'aTo');
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    this.seedBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aFrom);
    gl.enableVertexAttribArray(this.aTo);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
  }

  get particleCount(): number {
    return this.count;
  }

  /** Upload (or replace) the target positions of shape `index`. */
  setShape(index: number, positions: Float32Array, palette: Palette): void {
    const { gl } = this;
    const buffer = this.shapeBuffers[index] ?? gl.createBuffer()!;
    this.shapeBuffers[index] = buffer;
    this.palettes[index] = palette;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.bound = [-1, -1];
  }

  setPalette(index: number, palette: Palette): void {
    this.palettes[index] = palette;
  }

  setTheme(dark: boolean): void {
    this.dark = dark;
  }

  /** Match the drawing buffer to the canvas's CSS size. Returns the aspect ratio. */
  resize(maxDpr: number): number {
    const { canvas, gl } = this;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * this.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    return w / h;
  }

  startBurst(x: number, y: number, now: number): void {
    this.burst = { x, y, start: now };
  }

  /** Draw fewer particles (never below a floor). Returns false when already at the floor. */
  degrade(): boolean {
    const floor = Math.min(this.count, 9000);
    if (this.drawCount <= floor) return false;
    this.drawCount = Math.max(floor, Math.round(this.drawCount * 0.7));
    return true;
  }

  render(
    state: FieldState,
    opts: { time: number; intro: number; motion: number; tiltX: number; tiltY: number; pointerX: number; pointerY: number; pointerOn: number; bg: Rgb },
  ): void {
    const { gl, uniforms: u } = this;
    const aspect = this.canvas.width / this.canvas.height;
    // Bind the two shapes of this transition (only when they change).
    if (this.bound[0] !== state.from || this.bound[1] !== state.to) {
      const from = this.shapeBuffers[state.from];
      const to = this.shapeBuffers[state.to];
      if (!from || !to) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, from);
      gl.vertexAttribPointer(this.aFrom, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, to);
      gl.vertexAttribPointer(this.aTo, 3, gl.FLOAT, false, 0, 0);
      this.bound = [state.from, state.to];
    }
    gl.clearColor(opts.bg[0], opts.bg[1], opts.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Light on a dark ground adds up; ink on a light ground covers.
    if (this.dark) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const fromPalette = this.palettes[state.from];
    const toPalette = this.palettes[state.to];
    gl.uniform1f(u.uT, state.t);
    gl.uniform1f(u.uTime, opts.time);
    gl.uniform1f(u.uIntro, opts.intro);
    gl.uniform1f(u.uMotion, opts.motion);
    gl.uniform1f(u.uAspect, aspect);
    // Fewer particles are drawn larger, so a degraded cloud keeps its mass.
    const density = Math.sqrt(this.count / this.drawCount);
    // A shape drawn small packs the same particles into less area: shrink the points with it,
    // or a phone-sized shape burns out to white.
    const packed = Math.min(1, Math.max(0.6, state.scale / 0.42));
    const px = (this.canvas.height / 900) * 3.4 * density * packed;
    const alpha = 0.36 + 0.16 * packed;
    gl.uniform1f(u.uPx, px);
    gl.uniform1f(u.uScale, state.scale);
    gl.uniform2f(u.uOffset, state.x, state.y);
    gl.uniform2f(u.uTilt, opts.tiltX, opts.tiltY);
    gl.uniform3f(u.uPointer, opts.pointerX, opts.pointerY, opts.pointerOn);
    const age = this.burst.start < 0 ? -1 : opts.time - this.burst.start;
    gl.uniform3f(u.uBurst, this.burst.x, this.burst.y, age > 1.1 ? -1 : age);
    gl.uniform3fv(u.uFromA, fromPalette.a);
    gl.uniform3fv(u.uFromB, fromPalette.b);
    gl.uniform3fv(u.uToA, toPalette.a);
    gl.uniform3fv(u.uToB, toPalette.b);
    gl.uniform1f(u.uGlow, this.dark ? 1 : 0);
    // Pass 1, the halo: a seventh of the particles, drawn large and faint. On the dark ground
    // this adds up to a bloom around dense areas without a blur pass.
    gl.uniform1f(u.uPx, px * 7);
    gl.uniform1f(u.uAlpha, (this.dark ? 0.05 : 0.035) * packed);
    gl.drawArrays(gl.POINTS, 0, Math.round(this.drawCount / 7));
    // Pass 2, the particles themselves.
    gl.uniform1f(u.uPx, px);
    gl.uniform1f(u.uAlpha, this.dark ? alpha : alpha * 0.92);
    gl.drawArrays(gl.POINTS, 0, this.drawCount);
  }

  destroy(): void {
    const { gl } = this;
    this.shapeBuffers.forEach(buffer => gl.deleteBuffer(buffer));
    gl.deleteBuffer(this.seedBuffer);
    gl.deleteProgram(this.program);
  }
}
