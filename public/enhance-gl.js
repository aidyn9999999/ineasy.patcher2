// Frame filter for the enhancer, run on the user's GPU (WebGL2). Nothing leaves the browser.
// Steps per pixel: light edge-preserving denoise, luma unsharp mask, contrast, saturation.
window.INEASYEnhanceGL = (function () {
  const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = (aPos + 1.0) * 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uTex; uniform vec2 uTexel;
uniform float uDenoise, uSharp, uContrast, uSat;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 tap(vec2 o) { return texture(uTex, vUv + o * uTexel).rgb; }
void main() {
  vec3 c = tap(vec2(0.0));
  // 3x3 gaussian blur: the reference for both the denoise and the sharpening
  vec3 b = c * 4.0
    + (tap(vec2(1.0, 0.0)) + tap(vec2(-1.0, 0.0)) + tap(vec2(0.0, 1.0)) + tap(vec2(0.0, -1.0))) * 2.0
    + tap(vec2(1.0, 1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, -1.0));
  b /= 16.0;
  float detail = luma(c) - luma(b);
  // flat areas are pulled towards the blur (noise), real edges are left alone
  c = mix(c, b, uDenoise * (1.0 - smoothstep(0.015, 0.08, abs(detail))));
  c += uSharp * detail;
  c = (c - 0.5) * uContrast + 0.5;
  c = mix(vec3(luma(c)), c, uSat);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  // Same three styles as the site shows; numbers follow the earlier server presets (strength 25 %).
  const STYLES = {
    natural: { denoise: 0.35, sharp: 0.8, contrast: 1.02, sat: 1.05 },
    sharp: { denoise: 0.5, sharp: 1.6, contrast: 1.03, sat: 1.05 },
    vivid: { denoise: 0.3, sharp: 0.8, contrast: 1.05, sat: 1.18 },
  };

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(shader));
    return shader;
  }

  // Returns { render(source) -> VideoFrame, close() } for frames of the given size.
  function create(width, height, style) {
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl_unavailable');
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('shader_link: ' + gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const s = STYLES[style] || STYLES.natural;
    gl.uniform2f(gl.getUniformLocation(program, 'uTexel'), 1 / width, 1 / height);
    gl.uniform1f(gl.getUniformLocation(program, 'uDenoise'), s.denoise);
    gl.uniform1f(gl.getUniformLocation(program, 'uSharp'), s.sharp);
    gl.uniform1f(gl.getUniformLocation(program, 'uContrast'), s.contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'uSat'), s.sat);
    gl.viewport(0, 0, width, height);

    return {
      // source: a VideoFrame or any canvas image source; timestamp/duration are in microseconds.
      render(source, timestamp, duration) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // a VideoFrame is a snapshot, so the canvas can be reused for the next frame right away
        return new VideoFrame(canvas, { timestamp, duration });
      },
      close() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
    };
  }

  return { create, STYLES };
})();
