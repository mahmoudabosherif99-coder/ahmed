import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Printer, Download } from 'lucide-react'

interface Product {
  id: string
  name: string
  code: string
  quantity: number
  min_quantity: number
  expiry_date: string
}

export default function Reports() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'low-stock'>('all')

  useEffect(() => { fetchProducts() }, [])

  // يقرأ الفلتر من رابط الصفحة (لما توصل من لوحة التحكم بالدوس على أحد الكروت)
  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.filter
    if (q === 'expired' || q === 'expiring' || q === 'low-stock' || q === 'all') {
      setFilter(q)
    }
  }, [router.isReady, router.query.filter])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('products').select('*').order('expiry_date')
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredProducts = () => {
    const now = new Date()
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    switch (filter) {
      case 'expired':
        return products.filter((p) => new Date(p.expiry_date) < now)
      case 'expiring':
        return products.filter((p) => new Date(p.expiry_date) >= now && new Date(p.expiry_date) <= ninetyDaysFromNow)
      case 'low-stock':
        return products.filter((p) => p.quantity <= p.min_quantity)
      default:
        return products
    }
  }

  const printReport = (title: string, data: Product[]) => {
    const printWindow = window.open('', '', 'height=600,width=800')
    const tableRows = data.map((p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.code}</td>
        <td>${p.quantity}</td>
        <td>${p.min_quantity}</td>
        <td>${new Date(p.expiry_date).toLocaleDateString('ar-EG')}</td>
      </tr>
    `).join('')

    printWindow?.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            * { font-family: Arial, sans-serif; }
            body { padding: 20px; background: white; }
            h1 { text-align: center; color: #333; }
            .info { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #15803d; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <h1>💊 ${title}</h1>
          <div class="info"><p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p></div>
          <table>
            <thead><tr><th>اسم الدواء</th><th>الكود</th><th>الكمية الحالية</th><th>الحد الأدنى</th><th>تاريخ الانتهاء</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer"><p>تم إنشاء هذا الكشف بواسطة نظام إدارة المخزون</p></div>
        </body>
      </html>
    `)
    printWindow?.document.close()
    printWindow?.print()
  }

  const downloadCSV = (data: Product[], filename: string) => {
    const headers = ['اسم الدواء', 'الكود', 'الكمية الحالية', 'الحد الأدنى', 'تاريخ الانتهاء']
    const rows = data.map((p) => [p.name, p.code, p.quantity, p.min_quantity, new Date(p.expiry_date).toLocaleDateString('ar-EG')])
    let csv = headers.join(',') + '\n'
    rows.forEach((row) => { csv += row.join(',') + '\n' })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredData = getFilteredProducts()

  const stats = {
    expired: products.filter((p) => new Date(p.expiry_date) < new Date()).length,
    expiring: products.filter((p) => {
      const now = new Date()
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      return new Date(p.expiry_date) >= now && new Date(p.expiry_date) <= ninetyDaysFromNow
    }).length,
    lowStock: products.filter((p) => p.quantity <= p.min_quantity).length,
  }

  const getFilterTitle = () => {
    switch (filter) {
      case 'expired': return 'الأدوية المنتهية الصلاحية'
      case 'expiring': return 'الأدوية القريبة من الانتهاء (90 يوم)'
      case 'low-stock': return 'الأدوية ذات المخزون المنخفض'
      default: return 'جميع الأدوية'
    }
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">الكشفات والتقارير</h1>
          <p className="text-gray-600 text-sm md:text-base mt-1">اعرض وطبع كشفات المخزن</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-red-50 border-r-4 border-red-500 p-3 md:p-4 rounded-lg">
            <p className="text-xs md:text-sm font-medium text-red-700">منتهية الصلاحية</p>
            <p className="text-xl md:text-2xl font-bold text-red-900 mt-1 md:mt-2">{stats.expired}</p>
          </div>
          <div className="bg-orange-50 border-r-4 border-orange-500 p-3 md:p-4 rounded-lg">
            <p className="text-xs md:text-sm font-medium text-orange-700">قرب الانتهاء (90 يوم)</p>
            <p className="text-xl md:text-2xl font-bold text-orange-900 mt-1 md:mt-2">{stats.expiring}</p>
          </div>
          <div className="bg-yellow-50 border-r-4 border-yellow-500 p-3 md:p-4 rounded-lg">
            <p className="text-xs md:text-sm font-medium text-yellow-700">مخزون منخفض</p>
            <p className="text-xl md:text-2xl font-bold text-yellow-900 mt-1 md:mt-2">{stats.lowStock}</p>
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
            <button onClick={() => setFilter('all')} className={`px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${filter === 'all' ? 'bg-pharmacy-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>جميع</button>
            <button onClick={() => setFilter('expired')} className={`px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${filter === 'expired' ? 'bg-pharmacy-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>منتهي ({stats.expired})</button>
            <button onClick={() => setFilter('expiring')} className={`px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${filter === 'expiring' ? 'bg-pharmacy-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>قرب الانتهاء ({stats.expiring})</button>
            <button onClick={() => setFilter('low-stock')} className={`px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${filter === 'low-stock' ? 'bg-pharmacy-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>منخفض ({stats.lowStock})</button>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <button onClick={() => printReport(getFilterTitle(), filteredData)} className="flex-1 md:flex-initial bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center md:justify-start gap-2 hover:bg-blue-600 transition-colors text-sm">
              <Printer size={18} />طباعة
            </button>
            <button onClick={() => downloadCSV(filteredData, getFilterTitle().replace(/\s+/g, '_'))} className="flex-1 md:flex-initial bg-green-500 text-white px-4 py-2 rounded-lg flex items-center justify-center md:justify-start gap-2 hover:bg-green-600 transition-colors text-sm">
              <Download size={18} />Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 md:p-4 border-b"><h2 className="text-base md:text-lg font-bold">{getFilterTitle()}</h2></div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-4 md:p-6 text-sm">جاري التحميل...</p>
            ) : filteredData.length === 0 ? (
              <p className="p-4 md:p-6 text-sm text-gray-600">لا توجد نتائج تطابق الفلتر المختار</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">اسم الدواء</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكود</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكمية الحالية</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الحد الأدنى</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">تاريخ الانتهاء</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((product) => {
                        const isExpired = new Date(product.expiry_date) < new Date()
                        const isExpiringoon = (() => {
                          const now = new Date()
                          const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
                          return new Date(product.expiry_date) >= now && new Date(product.expiry_date) <= ninetyDaysFromNow
                        })()
                        const isLowStock = product.quantity <= product.min_quantity
                        let statusLabel = 'متاح'
                        let statusColor = 'bg-green-100 text-green-800'
                        if (isExpired) { statusLabel = 'منتهي الصلاحية'; statusColor = 'bg-red-100 text-red-800' }
                        else if (isExpiringoon) { statusLabel = 'قرب الانتهاء'; statusColor = 'bg-orange-100 text-orange-800' }
                        else if (isLowStock) { statusLabel = 'مخزون منخفض'; statusColor = 'bg-yellow-100 text-yellow-800' }
                        return (
                          <tr key={product.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{product.code}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product.quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product.min_quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(product.expiry_date).toLocaleDateString('ar-EG')}</td>
                            <td className="px-6 py-4 text-sm"><span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-3 space-y-2">
                  {filteredData.map((product) => {
                    const isExpired = new Date(product.expiry_date) < new Date()
                    const isExpiringoon = (() => {
                      const now = new Date()
                      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
                      return new Date(product.expiry_date) >= now && new Date(product.expiry_date) <= ninetyDaysFromNow
                    })()
                    const isLowStock = product.quantity <= product.min_quantity
                    let statusLabel = 'متاح'
                    let statusColor = 'bg-green-100 text-green-800'
                    if (isExpired) { statusLabel = 'منتهي'; statusColor = 'bg-red-100 text-red-800' }
                    else if (isExpiringoon) { statusLabel = 'قرب الانتهاء'; statusColor = 'bg-orange-100 text-orange-800' }
                    else if (isLowStock) { statusLabel = 'منخفض'; statusColor = 'bg-yellow-100 text-yellow-800' }
                    return (
                      <div key={product.id} className="border rounded-lg p-3 bg-gray-50">
                        <p className="font-medium text-sm text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-600 mt-1">كود: {product.code}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div><p className="text-gray-600">الكمية</p><p className="font-medium">{product.quantity}</p></div>
                          <div><p className="text-gray-600">الحد الأدنى</p><p className="font-medium">{product.min_quantity}</p></div>
                          <div><p className="text-gray-600">الصلاحية</p><p className="font-medium">{new Date(product.expiry_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</p></div>
                        </div>
                        <div className="mt-2"><span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span></div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
