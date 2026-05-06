import { useRef, useEffect, useCallback } from 'react';
import { useWledStore } from '../store/wledStore';
import { runEffect } from '../wled/effects';
import { getStripType } from '../wled/ledStrips';
import type { RGBTriple, WLEDState, WLEDConfig } from '../wled/types';

function computeAllColors(state: WLEDState, config: WLEDConfig, time: number): RGBTriple[] {
  const total = config.ledCount;
  const pixels: RGBTriple[] = Array(total).fill([0, 0, 0]);

  if (!state.on) return pixels;

  const masterBri = state.bri / 255;

  for (const seg of state.seg) {
    if (!seg.on) continue;
    const segBri = (seg.bri / 255) * masterBri;
    const len = Math.min(seg.stop, total) - seg.start;
    if (len <= 0) continue;

    const colors = runEffect(time, seg, len);

    for (let i = 0; i < len; i++) {
      const idx = seg.start + i;
      if (idx >= total) break;
      const c = colors[i] ?? [0, 0, 0];
      pixels[idx] = [
        Math.min(255, Math.round(c[0] * segBri)),
        Math.min(255, Math.round(c[1] * segBri)),
        Math.min(255, Math.round(c[2] * segBri)),
      ];
    }
  }

  return pixels;
}

function render1D(
  ctx: CanvasRenderingContext2D,
  colors: RGBTriple[],
  w: number,
  h: number,
  ledsPerPixel = 1
) {
  const n = colors.length;
  const padding = 12;
  const available = w - padding * 2;
  const cy = h / 2;

  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, w, h);

  // When ledsPerPixel > 1, dots within a pixel group have a small gap,
  // and groups are separated by a slightly larger gap.
  const dotGap = 1.5;
  const groupGap = ledsPerPixel > 1 ? 4 : 0;
  const totalDots = n * ledsPerPixel;
  const totalIntraGaps = n * (ledsPerPixel - 1) * dotGap;
  const totalGroupGaps = (n - 1) * groupGap;
  const totalInterGaps = (n - 1) * dotGap; // gaps between groups (as base dot gaps)

  // Available space for dots = available - all gaps
  const spaceForDots = available - totalIntraGaps - totalGroupGaps - totalInterGaps;
  let dotSize = Math.min(spaceForDots / totalDots, h * 0.5, 40);
  dotSize = Math.max(2, dotSize);

  const groupWidth = ledsPerPixel * dotSize + (ledsPerPixel - 1) * dotGap;
  const groupStep = groupWidth + dotGap + groupGap;

  const stripH = dotSize + 16;
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(padding - 4, cy - stripH / 2, available + 8, stripH);
  ctx.strokeStyle = '#2a2d3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding - 4, cy - stripH / 2, available + 8, stripH);

  for (let i = 0; i < n; i++) {
    const [r, g, b] = colors[i];
    const brightness = (r + g + b) / 765;
    const groupX = padding + i * groupStep;

    for (let d = 0; d < ledsPerPixel; d++) {
      const x = groupX + d * (dotSize + dotGap) + dotSize / 2;
      const radius = dotSize / 2;

      if (brightness > 0.01) {
        const glowRadius = radius * (1.5 + brightness * 2);
        const grd = ctx.createRadialGradient(x, cy, 0, x, cy, glowRadius);
        grd.addColorStop(0, `rgba(${r},${g},${b},${brightness * 0.6})`);
        grd.addColorStop(0.4, `rgba(${r},${g},${b},${brightness * 0.15})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = brightness > 0.01 ? `rgb(${r},${g},${b})` : '#111318';
      ctx.fill();

      ctx.strokeStyle = brightness > 0.1 ? `rgba(${r},${g},${b},0.3)` : '#2a2d3a';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (brightness > 0.05) {
        ctx.beginPath();
        ctx.arc(x - radius * 0.25, cy - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${brightness * 0.4})`;
        ctx.fill();
      }
    }
  }
}

function render2D(
  ctx: CanvasRenderingContext2D,
  colors: RGBTriple[],
  w: number,
  h: number,
  cols: number,
  rows: number
) {
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, w, h);

  const padding = 16;
  const cellW = (w - padding * 2) / cols;
  const cellH = (h - padding * 2) / rows;
  const ledR = Math.min(cellW, cellH) * 0.38;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const [r, g, b] = colors[idx] ?? [0, 0, 0];
      const cx = padding + col * cellW + cellW / 2;
      const cy = padding + row * cellH + cellH / 2;
      const brightness = (r + g + b) / 765;

      if (brightness > 0.01) {
        const glowR = ledR * (2 + brightness * 2);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        grd.addColorStop(0, `rgba(${r},${g},${b},${brightness * 0.5})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, ledR, 0, Math.PI * 2);
      ctx.fillStyle = brightness > 0.01 ? `rgb(${r},${g},${b})` : '#0f1117';
      ctx.fill();
      ctx.strokeStyle = '#1e2130';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

export function LedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef(useWledStore.getState());

  // Subscribe without re-rendering
  useEffect(() => {
    return useWledStore.subscribe((s) => {
      stateRef.current = s;
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { state, config } = stateRef.current;
    const w = canvas.width;
    const h = canvas.height;

    const colors = computeAllColors(state, config, performance.now());
    const ledsPerPixel = getStripType(config.stripType)?.ledsPerPixel ?? 1;

    if (config.is2D) {
      render2D(ctx, colors, w, h, config.matrixWidth, config.matrixHeight);
    } else {
      render1D(ctx, colors, w, h, ledsPerPixel);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
