import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Trash2, Edit2, AlertTriangle, Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  quantity: number
  min_quantity: number
  expiry_date: string
  type?: string
  package_size?: string
}

const emptyForm = {
  name: '',
  quantity: '' as string | number,
  min_quantity: '' as string | number,
  expiry_date: '',
  type: '',
  package_size: '',
}

export default function Warehouse() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        quantity: Number(formData.quantity) || 0,
        min_quantity: Number(formData.min_quantity) || 0,
        expiry_date: formData.expiry_date,
        type: formData.type || null,
        package_size: formData.package_size || null,
      }

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        // كود تلقائي فريد للدواء
        const code = `MED-${Date.now().toString().slice(-8)}`
        const { error } = await supabase.from('products').insert([{ ...payload, code }])
        if (error) throw error
      }
      fetchProducts()
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      quantity: product.quantity,
      min_quantity: product.min_quantity,
      expiry_date: product.expiry_date,
      type: product.type || '',
      package_size: product.package_size || '',
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const isExpired = (date: string) => new Date(date) < new Date()

  const isExpiringoon = (date: string) => {
    const now = new Date()
    const expiryDate = new Date(date)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    return expiryDate <= ninetyDaysFromNow && expiryDate >= now
  }

  const isLowStock = (quantity: number, minQuantity: number) => quantity <= minQuantity

  // يمسح الصفر تلقائياً عند الدخول على الحقل
  const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      p.name.toLowerCase().includes(term) ||
      (p.type || '').toLowerCase().includes(term)
    )
  })

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">المخزن</h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              if (showForm) setFormData(emptyForm)
            }}
            className="w-full md:w-auto bg-pharmacy-500 text-white px-4 py-2 rounded-lg flex items-center justify-center md:justify-start gap-2 hover:bg-pharmacy-600 transition-colors"
          >
            <Plus size={20} />
            إضافة دواء
          </button>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو النوع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 md:py-3 border rounded-lg text-sm md:text-base"
            />
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h2 className="text-lg md:text-xl font-bold mb-4">{editingId ? 'تعديل الدواء' : 'إضافة دواء جديد'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input
                type="text"
                placeholder="اسم الدواء"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <input
                type="text"
                placeholder="نوع الدواء (شراب / أقراص / حقن...)"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <input
                type="number"
                placeholder="العدد"
                value={formData.quantity}
                onFocus={selectAllOnFocus}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <input
                type="number"
                placeholder="الحد الأدنى للكمية"
                value={formData.min_quantity}
                onFocus={selectAllOnFocus}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                required
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <input
                type="text"
                placeholder="حجم العبوة (مثال: 20 قرص / 100 مل)"
                value={formData.package_size}
                onChange={(e) => setFormData({ ...formData, package_size: e.target.value })}
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                required
                className="p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
              <div className="col-span-1 md:col-span-2 flex gap-2">
                <button type="submit" className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm md:text-base">
                  {editingId ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData(emptyForm) }} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm md:text-base">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-4 md:p-6 text-sm">جاري التحميل...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="p-4 md:p-6 text-sm text-gray-600">{searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد أدوية في المخزن حتى الآن'}</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الاسم</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">النوع</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">حجم العبوة</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الكمية</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الصلاحية</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{product.type || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{product.package_size || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{product.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{new Date(product.expiry_date).toLocaleDateString('ar-EG')}</td>
                        <td className="px-6 py-4 text-sm">
                          {isExpired(product.expiry_date) ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle size={14} /> منتهي</span>
                          ) : isExpiringoon(product.expiry_date) ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle size={14} /> قرب الانتهاء</span>
                          ) : isLowStock(product.quantity, product.min_quantity) ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle size={14} /> مخزون منخفض</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">متاح</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm flex gap-2">
                          <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800" title="تعديل"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800" title="حذف"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden p-4 space-y-3">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.type || '-'} {product.package_size ? `· ${product.package_size}` : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="تعديل"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div><p className="text-xs text-gray-600">الكمية</p><p className="font-medium text-sm">{product.quantity}</p></div>
                      <div><p className="text-xs text-gray-600">الحد الأدنى</p><p className="font-medium text-sm">{product.min_quantity}</p></div>
                      <div><p className="text-xs text-gray-600">الصلاحية</p><p className="font-medium text-sm">{new Date(product.expiry_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</p></div>
                    </div>
                    <div>
                      {isExpired(product.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle size={12} /> منتهي</span>
                      ) : isExpiringoon(product.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle size={12} /> قرب الانتهاء</span>
                      ) : isLowStock(product.quantity, product.min_quantity) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle size={12} /> منخفض</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ متاح</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
