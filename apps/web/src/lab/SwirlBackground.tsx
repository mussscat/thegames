import { useEffect, useRef } from 'react';

export type Palette = { readonly name: string; readonly colors: readonly [string, string, string] };

export const PALETTES: readonly Palette[] = [
  { name: 'Балатро', colors: ['#3b1c32', '#b4282d', '#f2994a'] },
  { name: 'Сукно', colors: ['#0b2a22', '#1f6b4a', '#d9b44a'] },
  { name: 'Неон', colors: ['#1d2b53', '#7e2553', '#29adff'] },
];

const VERTEX = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
const FRAGMENT = `
precision mediump float;
uniform float t; uniform vec2 res; uniform float px;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
void main() {
  vec2 cell = floor(gl_FragCoord.xy / px) * px;
  vec2 p = (cell - 0.5 * res) / res.y;
  float r = length(p);
  float a = atan(p.y, p.x) + r * 5.0 - t * 0.25;
  float v = sin(a * 3.0 + sin(r * 9.0 - t * 0.8) * 1.6) * 0.5 + 0.5;
  float w = sin(p.x * 7.0 + t * 0.6 + sin(p.y * 5.0 - t * 0.4) * 2.0) * 0.5 + 0.5;
  vec3 col = mix(c1, c2, smoothstep(0.2, 0.8, v));
  col = mix(col, c3, w * 0.28);
  gl_FragColor = vec4(col * (1.0 - r * 0.45), 1.0);
}`;

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile failed', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/** Balatro-like pixelated swirl drawn with a tiny WebGL shader; falls back to the CSS background. */
export function SwirlBackground({ palette, pixel, speed }: { readonly palette: Palette; readonly pixel: number; readonly speed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl');
    if (!canvas || !gl) return undefined;
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return undefined;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    palette.colors.forEach((hex, i) => gl.uniform3fv(uniform(`c${i + 1}`), hexToRgb(hex)));
    gl.uniform1f(uniform('px'), pixel * window.devicePixelRatio);

    let frame = 0;
    const start = performance.now();
    const draw = (): void => {
      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uniform('res'), width, height);
      gl.uniform1f(uniform('t'), ((performance.now() - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [palette, pixel, speed]);

  return <canvas ref={canvasRef} className="lab__bg" aria-hidden="true" />;
}
