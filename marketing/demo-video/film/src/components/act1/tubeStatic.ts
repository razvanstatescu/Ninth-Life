/**
 * tubeStatic(): analog "snow" for the old television, made to meet the film's viewer-safety rules
 * (02-creative-direction.md, section 9): fine grain (cells of `cell` px, 2 by default), mid-grey and
 * low contrast (grain values between `lo` and `hi` in sRGB; the defaults give a relative luminance
 * of about 0.08 to 0.35), and a new pattern only when `seed` changes (drive it at 12 Hz).
 *
 * Unlike whiteNoise() (black to white), the grain never reaches black or white. The noise is mixed
 * only where the source is opaque, so a picture squeezed to a line during the switch-on carries its
 * static with it and the dark around it stays dark.
 */
import { createEffect, type InteractivitySchema } from 'remotion';

export type TubeStaticParams = {
  /** How much of the picture is replaced by snow, 0..1. 1 = "no signal". */
  readonly amount?: number;
  /** Pattern seed. Change it 12 times a second. */
  readonly seed?: number;
  /** Darkest grain value (sRGB 0..1). */
  readonly lo?: number;
  /** Brightest grain value (sRGB 0..1). */
  readonly hi?: number;
  /** Grain size in device pixels. At most 2 at 1080p (safety). */
  readonly cell?: number;
};

// sRGB 0.33..0.57: after the scanlines (x0.9..x1.1) the grain stays within relative luminance ~0.08..0.35.
const DEF = { amount: 1, seed: 0, lo: 0.33, hi: 0.57, cell: 2 };

const resolve = (p: TubeStaticParams) => ({
  amount: p.amount ?? DEF.amount,
  seed: p.seed ?? DEF.seed,
  lo: p.lo ?? DEF.lo,
  hi: p.hi ?? DEF.hi,
  cell: p.cell ?? DEF.cell,
});

const schema = {
  amount: { type: 'number', min: 0, max: 1, step: 0.01, default: DEF.amount, description: 'Amount', hiddenFromList: false },
  seed: { type: 'number', step: 1, default: DEF.seed, description: 'Seed', hiddenFromList: false },
  lo: { type: 'number', min: 0, max: 1, step: 0.01, default: DEF.lo, description: 'Darkest grain', hiddenFromList: false },
  hi: { type: 'number', min: 0, max: 1, step: 0.01, default: DEF.hi, description: 'Brightest grain', hiddenFromList: false },
  cell: { type: 'number', min: 1, max: 2, step: 1, default: DEF.cell, description: 'Grain size', hiddenFromList: false },
} as const satisfies InteractivitySchema;

const VS = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
	vUv = aUv;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform float uAmount;
uniform float uSeed;
uniform float uLo;
uniform float uHi;
uniform float uCell;

uint hash3(uvec3 v) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v.x ^ v.y ^ v.z;
}

float rnd(vec2 c) {
	uvec3 u = uvec3(uint(c.x + 8192.0), uint(c.y + 8192.0), uint(uSeed + 17.0));
	return float(hash3(u) >> 8u) / 16777216.0;
}

void main() {
	vec4 color = texture(uSource, vUv);
	if (color.a <= 0.0) {
		fragColor = vec4(0.0);
		return;
	}
	vec2 cell = floor(gl_FragCoord.xy / uCell);
	// Analog snow: each grain smears a little into its right neighbour; rows vary slightly.
	float n = mix(rnd(cell), rnd(cell - vec2(1.0, 0.0)), 0.35);
	float row = rnd(vec2(-11.0, cell.y));
	n = clamp(n + (row - 0.5) * 0.14, 0.0, 1.0);
	float v = mix(uLo, uHi, n);
	vec3 snow = vec3(v * 0.97, v * 0.99, v * 1.03);
	vec3 rgb = color.rgb / color.a;
	fragColor = vec4(mix(rgb, snow, uAmount) * color.a, color.a);
}
`;

type State = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  texture: WebGLTexture;
  u: Record<'source' | 'amount' | 'seed' | 'lo' | 'hi' | 'cell', WebGLUniformLocation | null>;
};

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type);
  if (!s) throw new Error('tubeStatic: createShader failed');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`tubeStatic: ${info}`);
  }
  return s;
};

export const tubeStatic = createEffect<TubeStaticParams, State>({
  type: 'film.ninthlife.tubeStatic',
  label: 'tubeStatic()',
  documentationLink: null,
  backend: 'webgl2',
  calculateKey: (p) => {
    const r = resolve(p);
    return `tube-static-${r.amount}-${r.seed}-${r.lo}-${r.hi}-${r.cell}`;
  },
  setup: (target) => {
    const gl = target.getContext('webgl2', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('tubeStatic: no WebGL2 context');
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const program = gl.createProgram();
    if (!program) throw new Error('tubeStatic: createProgram failed');
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`tubeStatic: ${gl.getProgramInfoLog(program)}`);
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const texture = gl.createTexture();
    if (!vao || !vbo || !texture) throw new Error('tubeStatic: WebGL resources');
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    const aUv = gl.getAttribLocation(program, 'aUv');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const loc = (n: string) => gl.getUniformLocation(program, n);
    return {
      gl,
      program,
      vao,
      vbo,
      texture,
      u: { source: loc('uSource'), amount: loc('uAmount'), seed: loc('uSeed'), lo: loc('uLo'), hi: loc('uHi'), cell: loc('uCell') },
    };
  },
  apply: ({ source, width, height, params, state, flipSourceY }) => {
    const r = resolve(params);
    const { gl, u } = state;
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipSourceY);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    gl.useProgram(state.program);
    gl.uniform1i(u.source, 0);
    gl.uniform1f(u.amount, r.amount);
    gl.uniform1f(u.seed, Math.round(r.seed) % 100000);
    gl.uniform1f(u.lo, r.lo);
    gl.uniform1f(u.hi, r.hi);
    gl.uniform1f(u.cell, Math.max(1, r.cell));
    gl.bindVertexArray(state.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  },
  cleanup: ({ gl, program, vao, vbo, texture }) => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(vbo);
    gl.deleteProgram(program);
    gl.deleteVertexArray(vao);
  },
  schema,
  validateParams: (p) => {
    const r = resolve(p ?? {});
    if (!(r.amount >= 0 && r.amount <= 1)) throw new TypeError('tubeStatic: amount must be 0..1');
    if (!(r.cell >= 1 && r.cell <= 2)) throw new TypeError('tubeStatic: cell must be 1 or 2 (safety: grain of 2 px or less)');
    if (!(r.lo >= 0 && r.hi <= 1 && r.lo <= r.hi)) throw new TypeError('tubeStatic: need 0 <= lo <= hi <= 1');
  },
});
