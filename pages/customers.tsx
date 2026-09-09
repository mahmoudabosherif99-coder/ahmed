import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Trash2, Edit2, Printer } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
}

interface Sale {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  sale_date: string
  products?: { name: string; code: string }
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSales = async (customerId: string) => {
    try {
      const { data, error } = await supabase.from('sales').select('*, products(name, code)').eq('customer_id', customerId).order('sale_date', { ascending: false })
      if (error) throw error
      setSales(data || [])
      setSelectedCustomerId(customerId)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
      }
      if (editingId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('customers').insert([payload])
        if (error) throw error
      }
      fetchData()
      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', phone: '', email: '', address: '' })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = (customer: Customer) => {
    setFormData({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '' })
    setEditingId(customer.id)
    setShowForm(true)
  }

  const printReport = () => {
    const customer = customers.find((c) => c.id === selectedCustomerId)
    const printWindow = window.open('', '', 'height=400,width=600')
    printWindow?.document.write(`
      <html dir="rtl">
        <head><title>كشف اصناف العميل</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #15803d; color: white; }
            h2 { text-align: center; }
          </style>
        </head>
        <body>
          <h2>💊 كشف اصناف العميل</h2>
          <p><strong>اسم العميل:</strong> ${customer?.name}</p>
          <p><strong>الهاتف:</strong> ${customer?.phone || '-'}</p>
          <table>
            <thead><tr><th>اسم الدواء</th><th>الكود</th><th>الكمية</th><th>تاريخ البيع</th></tr></thead>
            <tbody>
              ${sales.map((sale) => `<tr><td>${(sale as any).products?.name || 'غير معروف'}</td><td>${(sale as any).products?.code || 'غير معروف'}</td><td>${sale.quantity}</td><td>${new Date(sale.sale_date).toLocaleDateString('ar-EG')}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow?.document.close()
    printWindow?.print()
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">العملاء</h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              if (showForm) setFormData({ name: '', phone: '', email: '', address: '' })
            }}
            className="w-full md:w-auto bg-pharmacy-500 text-white px-4 py-2 rounded-lg flex items-center justify-center md:justify-start gap-2 hover:bg-pharmacy-600 transition-colors"
          >
            <Plus size={20} />
            إضافة عميل
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h2 className="text-lg md:text-xl font-bold mb-4">{editingId ? 'تعديل العميل' : 'إضافة عميل جديد'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input type="text" placeholder="اسم العميل" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="p-2 md:p-3 border rounded-lg text-sm md:text-base" />
              <input type="tel" placeholder="رقم الهاتف (اختياري)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="p-2 md:p-3 border rounded-lg text-sm md:text-base" />
              <input type="email" placeholder="البريد الإلكتروني (اختياري)" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="p-2 md:p-3 border rounded-lg text-sm md:text-base" />
              <input type="text" placeholder="العنوان (اختياري)" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="p-2 md:p-3 border rounded-lg text-sm md:text-base" />
              <div className="col-span-1 md:col-span-2 flex gap-2">
                <button type="submit" className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm md:text-base">{editingId ? 'تحديث' : 'إضافة'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm md:text-base">إلغاء</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b"><h2 className="text-lg font-bold">قائمة العملاء</h2></div>
            <div className="overflow-y-auto max-h-96">
              {loading ? (
                <p className="p-4">جاري التحميل...</p>
              ) : (
                <ul className="divide-y">
                  {customers.map((customer) => (
                    <li key={customer.id} className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedCustomerId === customer.id ? 'bg-pharmacy-50' : ''}`} onClick={() => fetchSales(customer.id)}>
                      <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{customer.phone || 'لا يوجد رقم هاتف'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">الأصناف المشتراة</h2>
              {selectedCustomerId && (
                <button onClick={printReport} className="text-blue-600 hover:text-blue-800 flex items-center gap-1"><Printer size={18} /> طباعة</button>
              )}
            </div>
            {selectedCustomerId ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الاسم</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكود</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكمية</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{(sale as any).products?.name || 'غير معروف'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{(sale as any).products?.code || 'غير معروف'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.sale_date).toLocaleDateString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && <p className="p-4 text-gray-600 text-sm">لا توجد أصناف مسجلة لهذا العميل بعد. يمكنك تسجيل عملية بيع من صفحة "البيع"</p>}
              </div>
            ) : (
              <p className="p-4 text-gray-600">اختر عميلاً لعرض أصنافه المشتراة</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b"><h2 className="text-lg font-bold">إدارة العملاء</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الاسم</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الهاتف</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">العنوان</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.address || '-'}</td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
