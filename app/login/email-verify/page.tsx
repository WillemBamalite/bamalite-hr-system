"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

const OTP_COOLDOWN_MS = 60_000
const OTP_RATE_LIMIT_BACKOFF_MS = 5 * 60_000

function formatOtpError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("rate limit")) {
    return "Te veel code-aanvragen kort achter elkaar. Wacht even en probeer opnieuw."
  }
  return message
}

export default function EmailVerifyPage() {
  const router = useRouter()
  const params = useSearchParams()
  const emailFromQuery = useMemo(() => params.get("email") || "", [params])
  const nextPath = useMemo(() => params.get("next") || "", [params])
  const purpose = useMemo(() => params.get("purpose") || "", [params])
  const [email, setEmail] = useState(emailFromQuery)

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const autoRequestedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const updateCooldown = () => {
      const lastRequestedAt = Number(window.sessionStorage.getItem("email_verify_last_request_at") || "0")
      const serverBlockedUntil = Number(window.sessionStorage.getItem("email_verify_retry_after_until") || "0")
      const localRemaining = Math.max(0, OTP_COOLDOWN_MS - (Date.now() - lastRequestedAt))
      const serverRemaining = Math.max(0, serverBlockedUntil - Date.now())
      const remainingMs = Math.max(localRemaining, serverRemaining)
      setCooldownSeconds(Math.ceil(remainingMs / 1000))
    }

    updateCooldown()
    const interval = setInterval(updateCooldown, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery)
      return
    }
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem("pending_email_verify_email") || ""
      if (saved) setEmail(saved)
    }
  }, [emailFromQuery])

  useEffect(() => {
    if (!email) {
      setError("Geen e-mailadres gevonden voor verificatie. Log opnieuw in.")
    } else {
      setError("")
    }
  }, [email])

  const requestOtp = async (mode: "auto" | "manual") => {
    if (!email) return
    if (typeof window !== "undefined") {
      const lastRequestedAt = Number(window.sessionStorage.getItem("email_verify_last_request_at") || "0")
      const serverBlockedUntil = Number(window.sessionStorage.getItem("email_verify_retry_after_until") || "0")
      const isLocallyCoolingDown = Date.now() - lastRequestedAt < OTP_COOLDOWN_MS
      const isServerBlocked = Date.now() < serverBlockedUntil
      if (mode === "manual" && (isLocallyCoolingDown || isServerBlocked)) {
        setError("Wacht even voordat je opnieuw verstuurt (maximaal 1x per minuut).")
        return
      }
    }

    setResendLoading(true)
    setError("")
    setInfo("")
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("email_verify_last_request_at", String(Date.now()))
      window.sessionStorage.setItem("email_verify_otp_requested", "1")
    }

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setResendLoading(false)
    if (resendError) {
      if (resendError.message?.toLowerCase().includes("rate limit") && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "email_verify_retry_after_until",
          String(Date.now() + OTP_RATE_LIMIT_BACKOFF_MS)
        )
      }
      setError(formatOtpError(resendError.message || "Opnieuw versturen mislukt"))
      return
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("email_verify_retry_after_until")
    }
    setInfo(
      mode === "auto"
        ? "Verificatiecode is verstuurd naar je e-mail."
        : "Nieuwe code is verstuurd naar je e-mail."
    )
  }

  useEffect(() => {
    if (!email) return
    if (autoRequestedRef.current) return
    if (typeof window !== "undefined") {
      const alreadyRequested = window.sessionStorage.getItem("email_verify_otp_requested") === "1"
      if (alreadyRequested) {
        setInfo("Vul de ontvangen verificatiecode in.")
        autoRequestedRef.current = true
        return
      }
    }
    autoRequestedRef.current = true
    requestOtp("auto")
  }, [email, purpose])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || code.length < 6) return
    setLoading(true)
    setError("")
    setInfo("")

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })

    setLoading(false)
    if (verifyError) {
      setError(verifyError.message || "Code ongeldig of verlopen")
      return
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pending_email_verify")
      window.sessionStorage.removeItem("pending_email_verify_email")
      window.sessionStorage.removeItem("email_verify_otp_requested")
      if (purpose === "salary") {
        window.sessionStorage.setItem("salary_page_verified", "1")
      }
    }
    if (nextPath) {
      router.push(nextPath)
    } else {
      router.push("/")
    }
  }

  const handleResend = async () => {
    await requestOtp("manual")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">E-mail verificatie</CardTitle>
          <CardDescription>
            Vul de 6-cijferige code in die naar je e-mail is gestuurd.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email-otp-code">Verificatiecode</Label>
              <Input
                id="email-otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
              {loading ? "Controleren..." : "Verifiëren"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading || !email || cooldownSeconds > 0}
            >
              {resendLoading
                ? "Versturen..."
                : cooldownSeconds > 0
                  ? `Code sturen (${cooldownSeconds}s)`
                  : "Code sturen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
