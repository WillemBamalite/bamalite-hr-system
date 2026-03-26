export function isCopiedCrewMember(member: any): boolean {
  const notePool = [
    ...(Array.isArray(member?.active_notes) ? member.active_notes : []),
    ...(Array.isArray(member?.notes) ? member.notes : []),
  ]

  return notePool.some((n: any) => {
    const content = String(n?.content || n?.text || n || "")
    return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
  })
}

export function isRealCrewMember(member: any): boolean {
  if (!member) return false
  if (member.status === "uit-dienst") return false
  if (member.is_dummy === true) return false
  if (isCopiedCrewMember(member)) return false
  return true
}
