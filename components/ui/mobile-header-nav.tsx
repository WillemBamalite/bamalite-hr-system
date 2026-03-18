"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export function MobileHeaderNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const navItems = [
    { href: "/", label: t('dashboard'), icon: "🏠" },
    { href: "/bemanning/overzicht", label: t('crew'), icon: "👥" },
    { href: "/bemanning/aflossers", label: t('reliefCrew'), icon: "🔄" },
    { href: "/bemanning/studenten", label: t('students'), icon: "🎓" },
    { href: "/bemanning/officiele-waarschuwingen", label: "Waarschuwingen", icon: "⚠️" },
    { href: "/bemanning/leningen", label: t('loans'), icon: "💰" },
    { href: "/documenten", label: t('documents'), icon: "📄" },
    { href: "/ziekte", label: t('sick'), icon: "🏥" },
  ];
  return (
    <nav className="block md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center px-2 py-1 text-xs font-medium transition-colors duration-150 rounded ${
              pathname === item.href
                ? "text-blue-700 bg-blue-50"
                : "text-gray-700 hover:text-blue-700"
            }`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
} 