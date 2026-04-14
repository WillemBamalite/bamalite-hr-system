"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, getTranslation, Translations } from '@/lib/i18n'
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
  const userEmail = (user?.email || "").trim().toLowerCase()
  const isGermanUser =
    userEmail === "tanja@bamalite.com" || userEmail === "lucie@bamalite.com"

  // Hard rule: Tanja always German, everyone else always Dutch.
  useEffect(() => {
    if (!user) {
      setLocaleState('nl')
      return
    }
    setLocaleState(isGermanUser ? 'de' : 'nl')
  }, [user, isGermanUser])

  const setLocale = async (newLocale: Locale) => {
    // Keep language fixed by user rule.
    if (!user) {
      setLocaleState('nl')
      return
    }
    setLocaleState(isGermanUser ? 'de' : 'nl')
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
