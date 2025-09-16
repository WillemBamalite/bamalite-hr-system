"use client"

import { useRouter } from 'next/navigation'
import { Button } from './button'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function BackButton({ 
  href, 
  className = '', 
  variant = 'outline',
  size = 'sm'
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Terug
    </Button>
  )
} 