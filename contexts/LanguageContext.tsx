"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, getTranslation, Translations } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof Translations) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>('nl')
  const { user } = useAuth()

  // Load preferred locale from Supabase user metadata
  useEffect(() => {
    const loadLocale = async () => {
      if (!user) return
      try {
        const { data } = await supabase.auth.getUser()
        const savedLocale = (data.user?.user_metadata as any)?.locale as Locale | undefined
        if (savedLocale && ['nl', 'de', 'fr'].includes(savedLocale)) {
          setLocaleState(savedLocale)
        }
      } catch (error) {
        console.error('Error loading locale:', error)
      }
    }
    loadLocale()
  }, [user])

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (user) {
      try {
        await supabase.auth.updateUser({ data: { locale: newLocale } })
      } catch (error) {
        console.error('Error saving locale:', error)
      }
    }
  }

  const t = (key: keyof Translations): string => {
    return getTranslation(locale, key)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
