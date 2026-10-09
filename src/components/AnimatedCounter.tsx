import { useEffect, useRef, useState } from 'react'

type AnimatedCounterProps = {
  value: number
  suffix?: string
  duration?: number
  prefix?: string
}

export default function AnimatedCounter({
  value,
  suffix = '',
  duration = 1400,
  prefix = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = counterRef.current
    if (!element) {
      return
    }

    let frameId = 0
    let observer: IntersectionObserver | undefined
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const animate = () => {
      const start = performance.now()

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - (1 - progress) ** 3
        setDisplayValue(value * eased)

        if (progress < 1) {
          frameId = window.requestAnimationFrame(tick)
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer?.disconnect()
        if (prefersReducedMotion) {
          setDisplayValue(value)
        } else {
          animate()
        }
      }
    }, { threshold: 0.25 })
    observer.observe(element)

    return () => {
      observer?.disconnect()
      window.cancelAnimationFrame(frameId)
    }
  }, [duration, value])

  const formatted =
    value >= 1000
      ? `${(displayValue / 1000).toFixed(displayValue >= 10000 ? 0 : 1).replace(/\.0$/, '')}K${suffix}`
      : `${Math.round(displayValue)}${suffix}`

  return (
    <span ref={counterRef} className="counter-number">
      {prefix}
      {formatted}
    </span>
  )
}
