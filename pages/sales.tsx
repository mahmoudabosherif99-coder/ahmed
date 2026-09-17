import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Edit2, Plus, ShoppingCart, Trash2 } from 'lucide-react'

type Customer = { id: string; name: string }
type Product = { id: string; name: string; quantity: number }
type Line = { product_id: string; quantity: string | number }
type SaleRow = { id: string; invoice_no: string; invoice_date: string; customer_id: string; product_id: string; quantity: number; customers?: { name: string }; products?: { name: string } }

const today = () => new Date().toISOString().slice(0, 10)
const newLine = (): Line => ({ product_id: '', quantity: '' })

export default function Sales() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<SaleRow[]>([])
  const [form, setForm] = useState({ customer_id: '', invoice_date: today(), invoice_no: '' })
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])
  const fetchData = async () => {
    setLoading(true)
    const [c, p, s] = await Promise.all([
      supabase.from('customers').select('id,name').order('name'),
      supabase.from('products').select('id,name,quantity').order('name'),
      supabase.from('sales').select('id,invoice_no,invoice_date,customer_id,product_id,quantity,customers(name),products(name)').order('invoice_date', { ascending: false }).limit(100),
    ])
    if (c.error || p.error || s.error) setMessage({ type: 'error', text: 'تعذر تحميل البيانات. تأكد من تشغيل ملف ترحيل الفواتير.' })
      setCustomers(c.data || []); setProducts(p.data || []); setRows((s.data as unknown as SaleRow[]) || []); setLoading(false)
  }
  const grouped = useMemo(() => Object.values(rows.reduce<Record<string, SaleRow[]>>((a, r) => { const key = r.invoice_no || r.id; (a[key] ||= []).push(r); return a }, {})), [rows])
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, n) => n === i ? { ...l, ...patch } : l))
  const reset = () => { setForm({ customer_id: '', invoice_date: today(), invoice_no: '' }); setLines([newLine()]); setEditingInvoice(null) }
  const deleteInvoice = async (invoice: SaleRow[]) => {
    if (!window.confirm(`حذف الفاتورة ${invoice[0].invoice_no}؟ سيتم إعادة الكميات للمخزن.`)) return
    try {
      for (const row of invoice) {
        const product = products.find(p => p.id === row.product_id)
        const result = await supabase.from('products').update({ quantity: (product?.quantity || 0) + row.quantity }).eq('id', row.product_id)
        if (result.error) throw result.error
      }
      const result = await supabase.from('sales').delete().eq('invoice_no', invoice[0].invoice_no)
      if (result.error) throw result.error
      setMessage({ type: 'success', text: 'تم حذف فاتورة البيع وإعادة الكميات للمخزن' })
      fetchData()
    } catch (error) { console.error(error); setMessage({ type: 'error', text: 'حدث خطأ أثناء حذف الفاتورة' }) }
  }
  const editInvoice = (invoice: SaleRow[]) => {
    const first = invoice[0]
    setEditingInvoice(first.invoice_no); setForm({ customer_id: first.customer_id, invoice_date: first.invoice_date, invoice_no: first.invoice_no })
    setLines(invoice.map(r => ({ product_id: r.product_id, quantity: r.quantity }))); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null)
    const clean = lines.filter(l => l.product_id && Number(l.quantity) > 0)
    if (!form.customer_id || !form.invoice_date || !clean.length) return setMessage({ type: 'error', text: 'اختر العميل والتاريخ وأضف صنفًا واحدًا على الأقل' })
    const totals: Record<string, number> = {}
    clean.forEach(l => { totals[l.product_id] = (totals[l.product_id] || 0) + Number(l.quantity) })
    for (const [id, qty] of Object.entries(totals)) { const p = products.find(x => x.id === id); const old = editingInvoice ? rows.filter(r => r.invoice_no === editingInvoice && r.product_id === id).reduce((n, r) => n + r.quantity, 0) : 0; if (p && qty > p.quantity + old) return setMessage({ type: 'error', text: `الكمية المتاحة من ${p.name} غير كافية` }) }
    try {
      const invoiceNo = form.invoice_no || `SALE-${Date.now().toString().slice(-8)}`
      if (editingInvoice) {
        const oldRows = rows.filter(r => r.invoice_no === editingInvoice)
        for (const r of oldRows) { await supabase.from('products').update({ quantity: (products.find(p => p.id === r.product_id)?.quantity || 0) + r.quantity }).eq('id', r.product_id) }
        const del = await supabase.from('sales').delete().eq('invoice_no', editingInvoice); if (del.error) throw del.error
      }
      const insert = await supabase.from('sales').insert(clean.map(l => ({ invoice_no: invoiceNo, invoice_date: form.invoice_date, customer_id: form.customer_id, product_id: l.product_id, quantity: Number(l.quantity) }))); if (insert.error) throw insert.error
      for (const [id, qty] of Object.entries(totals)) { const current = products.find(p => p.id === id)?.quantity || 0; const restored = editingInvoice ? rows.filter(r => r.invoice_no === editingInvoice && r.product_id === id).reduce((n, r) => n + r.quantity, 0) : 0; const u = await supabase.from('products').update({ quantity: current + restored - qty }).eq('id', id); if (u.error) throw u.error }
      setMessage({ type: 'success', text: editingInvoice ? 'تم تعديل الفاتورة وتحديث المخزن' : 'تم حفظ فاتورة البيع وتحديث المخزن' }); reset(); fetchData()
    } catch (err) { console.error(err); setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الفاتورة' }) }
  }
  return <Layout><div className="space-y-5"><div><h1 className="text-2xl md:text-3xl font-bold">البيع</h1><p className="text-gray-600 mt-1">فاتورة بيع بأكثر من صنف مع إمكانية التعديل</p></div>
    <div className="bg-white p-4 md:p-6 rounded-lg shadow"><h2 className="font-bold mb-4">{editingInvoice ? `تعديل الفاتورة ${editingInvoice}` : 'فاتورة بيع جديدة'}</h2>{message && <div className={`p-3 rounded mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message.text}</div>}
      <form onSubmit={save} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="p-3 border rounded-lg" required><option value="">اختر العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} className="p-3 border rounded-lg" required /><input value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} placeholder="رقم الفاتورة (اختياري)" className="p-3 border rounded-lg" disabled={!!editingInvoice} /></div>
        <div className="space-y-2">{lines.map((line, i) => <div key={i} className="flex gap-2"><select value={line.product_id} onChange={e => setLine(i, { product_id: e.target.value })} className="p-3 border rounded-lg flex-1" required><option value="">اختر الصنف</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (متاح: {p.quantity})</option>)}</select><input type="number" min="1" value={line.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder="الكمية" className="p-3 border rounded-lg w-28" required />{lines.length > 1 && <button type="button" onClick={() => setLines(lines.filter((_, n) => n !== i))} className="text-red-600"><Trash2 size={20} /></button>}</div>)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setLines([...lines, newLine()])} className="border border-pharmacy-500 text-pharmacy-600 px-4 py-2 rounded-lg flex items-center gap-1"><Plus size={18} />إضافة صنف</button><button className="bg-pharmacy-500 text-white px-5 py-2 rounded-lg flex items-center gap-2"><ShoppingCart size={18} />{editingInvoice ? 'حفظ التعديل' : 'حفظ الفاتورة'}</button>{editingInvoice && <button type="button" onClick={reset} className="bg-gray-500 text-white px-5 py-2 rounded-lg">إلغاء</button>}</div>
      </form></div>
    <div className="bg-white rounded-lg shadow overflow-hidden"><div className="p-4 border-b font-bold">الفواتير السابقة</div>{loading ? <p className="p-4">جاري التحميل...</p> : grouped.map(invoice => <div key={invoice[0].invoice_no || invoice[0].id} className="border-b p-4"><div className="flex flex-wrap justify-between gap-2"><div><b>فاتورة {invoice[0].invoice_no}</b><span className="text-gray-600 mr-3">{invoice[0].customers?.name} · {invoice[0].invoice_date}</span></div><div className="flex gap-3"><button onClick={() => editInvoice(invoice)} className="text-blue-600 flex items-center gap-1"><Edit2 size={16} />تعديل</button><button onClick={() => deleteInvoice(invoice)} className="text-red-600 flex items-center gap-1"><Trash2 size={16} />حذف</button></div></div><div className="text-sm text-gray-600 mt-2">{invoice.map(r => `${r.products?.name || '-'} (${r.quantity})`).join('، ')}</div></div>)}</div></div></Layout>
}
