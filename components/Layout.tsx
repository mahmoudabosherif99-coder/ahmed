import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  BarChart3,
  Users,
  Truck,
  Warehouse,
  ShoppingCart,
  ShoppingBag,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const navItems = [
    { href: '/', label: 'لوحة التحكم', icon: BarChart3 },
    { href: '/warehouse', label: 'المخزن', icon: Warehouse },
    { href: '/sales', label: 'البيع', icon: ShoppingCart },
    { href: '/purchases', label: 'شراء', icon: ShoppingBag },
    { href: '/customers', label: 'العملاء', icon: Users },
    { href: '/suppliers', label: 'الموردين', icon: Truck },
    { href: '/reports', label: 'الكشفات', icon: AlertCircle },
  ]

  const isActive = (href: string) => router.pathname === href

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      <div className="hidden md:flex w-64 bg-pharmacy-700 text-white flex-col shadow-lg">
        <div className="p-6 border-b border-pharmacy-600">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>💊</span>
            <span>صيدليتي</span>
          </h1>
          <p className="text-pharmacy-200 text-sm mt-1">نظام إدارة المخزون</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-pharmacy-600 text-white shadow-md'
                    : 'hover:bg-pharmacy-600 text-pharmacy-100'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-pharmacy-600 text-sm text-pharmacy-100 bg-pharmacy-800">
          <p className="font-medium">نسخة 1.1.0</p>
          <p className="mt-2 text-xs">جميع الحقوق محفوظة © 2024</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-pharmacy-700 text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="text-xl font-bold">💊 صيدليتي</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-pharmacy-600 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-pharmacy-700 text-white border-b border-pharmacy-600 shadow-md">
            <nav className="p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-pharmacy-600'
                        : 'hover:bg-pharmacy-600 text-pharmacy-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
