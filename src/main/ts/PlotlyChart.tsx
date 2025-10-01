import * as Plotly from 'plotly.js'
import * as React from 'react'

type Props = {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  style?: React.CSSProperties
  useResizeHandler?: boolean
}

export function PlotlyChart({ data, layout, config, style, useResizeHandler }: Props) {
  const plotRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (plotRef.current) {
      Plotly.react(plotRef.current, data, layout, config)
    }
  }, [data, layout, config])

  React.useEffect(() => {
    if (useResizeHandler && plotRef.current) {
      const handleResize = () => {
        if (plotRef.current) {
          Plotly.Plots.resize(plotRef.current)
        }
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [useResizeHandler])

  return <div ref={plotRef} style={style} />
}
