import { type HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge('rounded-xl border border-zinc-800 bg-zinc-900 p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={twMerge('text-lg font-semibold text-zinc-100', className)} {...props}>
      {children}
    </h2>
  )
}
