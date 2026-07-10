import { useEffect, useRef } from 'react'
import type { Candle, IndicatorId } from '@renderer/types/market'
import { closesOf, macd as macdCalc, rsi as rsiCalc } from '@renderer/lib/quant'
import { chartColors } from '@renderer/lib/chartTheme'

const MONO_FONT_STACK = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace'

interface Props {
  candles: Candle[]
  mode: Extract<IndicatorId, 'rsi' | 'macd'>
  theme: 'dark' | 'light'
}

export default function OscillatorPanel({ candles, mode, theme }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return
    const colors = chartColors(theme)
    const rect = canvas.parentElement!.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, rect.width * dpr)
    canvas.height = Math.max(1, rect.height * dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = rect.width
    const h = rect.height
    ctx.clearRect(0, 0, w, h)
    const pad = { l: 8, r: 52, t: 14, b: 10 }
    const closes = closesOf(candles)
    const x = (i: number): number => pad.l + (i / (closes.length - 1)) * (w - pad.l - pad.r)

    if (mode === 'rsi') {
      const values = rsiCalc(closes, 14)
      const y = (v: number): number => pad.t + (1 - v / 100) * (h - pad.t - pad.b)
      ctx.strokeStyle = colors.border
      ;[30, 50, 70].forEach((lvl) => {
        ctx.beginPath()
        ctx.moveTo(pad.l, y(lvl))
        ctx.lineTo(w - pad.r, y(lvl))
        ctx.stroke()
      })
      ctx.fillStyle = colors.text
      ctx.font = '10px ' + MONO_FONT_STACK
      ctx.fillText('70', w - pad.r + 8, y(70) + 3)
      ctx.fillText('30', w - pad.r + 8, y(30) + 3)
      ctx.strokeStyle = colors.accentA
      ctx.lineWidth = 1.6
      ctx.beginPath()
      values.forEach((v, i) => {
        const px = x(i)
        const py = y(v)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
    } else {
      const { macdLine, signalLine, histogram } = macdCalc(closes)
      const maxAbs = Math.max(...histogram.map(Math.abs), ...macdLine.map(Math.abs), 1e-6)
      const y = (v: number): number => pad.t + (1 - (v + maxAbs) / (2 * maxAbs)) * (h - pad.t - pad.b)
      const cw = Math.max(1.4, ((w - pad.l - pad.r) / closes.length) * 0.62)
      histogram.forEach((v, i) => {
        ctx.fillStyle = v >= 0 ? colors.gain : colors.loss
        ctx.globalAlpha = 0.5
        const top = Math.min(y(0), y(v))
        ctx.fillRect(x(i) - cw / 2, top, cw, Math.abs(y(v) - y(0)))
        ctx.globalAlpha = 1
      })
      const line = (vals: number[], color: string): void => {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        vals.forEach((v, i) => {
          const px = x(i)
          const py = y(v)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
      }
      line(macdLine, colors.accentA)
      line(signalLine, colors.accentB)
    }
  }, [candles, mode, theme])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}
