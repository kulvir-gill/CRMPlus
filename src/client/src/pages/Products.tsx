import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Product { id: number; name: string; description?: string; price: number; unit: string; isActive: boolean }

const empty = { name: '', description: '', price: '', unit: 'each', isActive: true }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/products', { params: { activeOnly: false } }).then((r) => setProducts(r.data))
  useEffect(() => { load() }, [])

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', price: p.price.toString(), unit: p.unit, isActive: p.isActive })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, price: parseFloat(form.price) }
    if (editing) await api.put(`/products/${editing.id}`, payload)
    else await api.post('/products', payload)
    setShowModal(false); load()
  }

  const remove = async (id: number) => { if (!confirm('Delete?')) return; await api.delete(`/products/${id}`); load() }
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader title="Product Catalog" subtitle={`${products.length} products`}
        action={<button onClick={() => { setEditing(null); setForm(empty); setShowModal(true) }} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Product</button>} />
      <div className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Name', 'Description', 'Price', 'Unit', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.description ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No products</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Product' : 'New Product'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {[['name', 'Name *', 'text'], ['description', 'Description', 'text'], ['price', 'Price *', 'number'], ['unit', 'Unit', 'text']].map(([k, label, type]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form[k as keyof typeof form] as string} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive as boolean} onChange={(e) => set('isActive', e.target.checked)} />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
