import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { AlertCircle, TrendingDown, Clock, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  quantity: number
  min_quantity: number
  expiry_date: string
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    expiredProducts: 0,
    expiringProducts: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: productsData, error: productsError } = await supabase.from('products').select('*')
      if (productsError) throw productsError

      const list: Product[] = productsData || []

      const now = new Date().toISOString().slice(0, 10)
      const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const lowStockCount = list.filter((p) => p.quantity <= p.min_quantity).length
      const expiredCount = list.filter((p) => p.expiry_date < now).length
      const expiringCount = list.filter((p) => p.expiry_date >= now && p.expiry_date <= ninetyDaysFromNow).length

      setStats({
        totalProducts: list.length,
        lowStockProducts: lowStockCount,
        expiredProducts: expiredCount,
        expiringProducts: expiringCount,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    filter,
  }: {
    icon: any
    label: string
    value: number
    color: string
    filter: string
  }) => (
    <button
      onClick={() => router.push(`/reports?filter=${filter}`)}
      className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-md transition-shadow text-right w-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs md:text-sm font-medium">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{value}</p>
        </div>
        <div className={`${color} p-2 md:p-3 rounded-lg`}>
          <Icon size={24} className="text-white md:w-7 md:h-7" />
        </div>
      </div>
    </button>
  )

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600 text-sm md:text-base mt-1">ملخص حالة المخزن الحالية — دوس على أي كارت لعرض التفاصيل</p>
        </div>

        {loading ? (
          <p className="text-gray-600 text-sm">جاري التحميل...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <StatCard icon={Package} label="إجمالي الأدوية بالمخزن" value={stats.totalProducts} color="bg-blue-500" filter="all" />
            <StatCard icon={TrendingDown} label="مخزون منخفض" value={stats.lowStockProducts} color="bg-yellow-500" filter="low-stock" />
            <StatCard icon={Clock} label="قرب الانتهاء (90 يوم)" value={stats.expiringProducts} color="bg-orange-500" filter="expiring" />
            <StatCard icon={AlertCircle} label="منتهية الصلاحية" value={stats.expiredProducts} color="bg-red-500" filter="expired" />
          </div>
        )}
      </div>
    </Layout>
  )
}
