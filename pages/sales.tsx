import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { ShoppingCart } from 'lucide-react'

interface Customer {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  quantity: number
}

interface SaleRecord {
  id: string
  quantity: number
  sale_date: string
  customers?: { name: string }
  products?: { name: string }
}

export default function Sales() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: '' as string | number,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [customersRes, productsRes, salesRes] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('products').select('id, name, quantity').order('name'),
        supabase
          .from('sales')
          .select('id, quantity, sale_date, customers(name), products(name)')
          .order('sale_date', { ascending: false })
          .limit(15),
      ])

      if (customersRes.error) throw customersRes.error
      if (productsRes.error) throw productsRes.error
      if (salesRes.error) throw salesRes.error

      setCustomers(customersRes.data || [])
      setProducts(productsRes.data || [])
      setRecentSales((salesRes.data as any) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const quantity = Number(formData.quantity) || 0
    const selectedProduct = products.find((p) => p.id === formData.product_id)

    if (!formData.customer_id || !formData.product_id || quantity <= 0) {
      setMessage({ type: 'error', text: 'من فضلك اختر العميل والدواء واكتب كمية صحيحة' })
      return
    }

    if (selectedProduct && quantity > selectedProduct.quantity) {
      setMessage({ type: 'error', text: `الكمية المتاحة في المخزن ${selectedProduct.quantity} فقط` })
      return
    }

    try {
      const { error: saleError } = await supabase.from('sales').insert([
        {
          customer_id: formData.customer_id,
          product_id: formData.product_id,
          quantity,
        },
      ])
      if (saleError) throw saleError

      if (selectedProduct) {
        const newQuantity = selectedProduct.quantity - quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', selectedProduct.id)
        if (updateError) throw updateError
      }

      setMessage({ type: 'success', text: 'تم تسجيل عملية البيع وتحديث المخزن بنجاح' })
      setFormData({ customer_id: '', product_id: '', quantity: '' })
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'حدث خطأ أثناء تسجيل عملية البيع' })
    }
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">البيع</h1>
          <p className="text-gray-600 text-sm md:text-base mt-1">سجّل عملية بيع لعميل وسيتم خصم الكمية من المخزن تلقائياً</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          {message && (
            <div
              className={`p-3 rounded-lg mb-4 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              required
              className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
            >
              <option value="">اختر العميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
            >
              <option value="">اختر الدواء</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (متاح: {p.quantity})</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="الكمية"
              value={formData.quantity}
              onFocus={selectAllOnFocus}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
            />

            <button
              type="submit"
              className="col-span-1 md:col-span-3 bg-pharmacy-500 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-pharmacy-600 transition-colors font-medium"
            >
              <ShoppingCart size={20} />
              تسجيل عملية البيع
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b"><h2 className="text-lg font-bold">آخر عمليات البيع</h2></div>
          {loading ? (
            <p className="p-4 text-sm">جاري التحميل...</p>
          ) : recentSales.length === 0 ? (
            <p className="p-4 text-sm text-gray-600">لا توجد عمليات بيع بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">العميل</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الدواء</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكمية</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{(sale as any).customers?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{(sale as any).products?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.sale_date).toLocaleString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
