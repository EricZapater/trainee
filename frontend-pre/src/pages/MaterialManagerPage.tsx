import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  ShoppingBag, 
  Package, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check, 
  User, 
  Trash2,
  FileSpreadsheet
} from 'lucide-react'
import { 
  getMaterialProductes, 
  createMaterialProducte, 
  deleteMaterialProducte, 
  uploadMaterialImage, 
  getMaterialComandes, 
  createMaterialComandes, 
  updateMaterialComanda, 
  type MaterialProducte, 
  type MaterialComanda 
} from '../api/material'

export const MaterialManagerPage: React.FC = () => {
  const { isEntrenador, isAdmin } = useAuth()
  const isCoach = isEntrenador || isAdmin

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog')
  const [products, setProducts] = useState<MaterialProducte[]>([])
  const [orders, setOrders] = useState<MaterialComanda[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Order modal (athlete ordering a product)
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<MaterialProducte | null>(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [orderNotes, setOrderNotes] = useState('')
  const [orderingLoading, setOrderingLoading] = useState(false)

  // Create Product Modal (coach/admin)
  const [createProductOpen, setCreateProductOpen] = useState(false)
  const [productForm, setProductForm] = useState({
    nom: '',
    descripcio: '',
    preu: 25,
    talles: 'S, M, L, XL'
  })
  const [productImage, setProductImage] = useState<File | null>(null)
  const [submittingProduct, setSubmittingProduct] = useState(false)

  // Filter orders
  const [statusFilter, setStatusFilter] = useState('all')

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [prods, comandes] = await Promise.all([
        getMaterialProductes().catch(() => []),
        getMaterialComandes().catch(() => [])
      ])
      setProducts(prods || [])
      setOrders(comandes || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant dades de material', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Order Submit
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForOrder) return

    setOrderingLoading(true)
    try {
      await createMaterialComandes([
        {
          producte_id: selectedProductForOrder.id,
          talla: selectedSize || undefined,
          quantitat: orderQuantity,
          notes: orderNotes.trim() || undefined
        }
      ])
      showToast('Comanda registrada correctament!')
      setSelectedProductForOrder(null)
      loadData()
      if (isCoach) setActiveTab('orders')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error enviant la comanda', 'error')
    } finally {
      setOrderingLoading(false)
    }
  }

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.nom.trim()) return

    setSubmittingProduct(true)
    try {
      let imageUrl = ''
      if (productImage) {
        imageUrl = await uploadMaterialImage(productImage)
      }

      const sizesArray = productForm.talles.split(',').map(s => s.trim()).filter(Boolean)

      await createMaterialProducte({
        nom: productForm.nom.trim(),
        descripcio: productForm.descripcio.trim() || undefined,
        preu: Number(productForm.preu),
        talles: sizesArray,
        imatge_url: imageUrl || undefined,
        actiu: true
      })

      showToast('Producte afegit al catàleg!')
      setCreateProductOpen(false)
      setProductForm({ nom: '', descripcio: '', preu: 25, talles: 'S, M, L, XL' })
      setProductImage(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error creant el producte', 'error')
    } finally {
      setSubmittingProduct(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (prod: MaterialProducte) => {
    if (!window.confirm(`Eliminar el producte "${prod.nom}"?`)) return
    try {
      await deleteMaterialProducte(prod.id)
      showToast('Producte eliminat')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error eliminant producte', 'error')
    }
  }

  // Update order status
  const handleUpdateOrderStatus = async (comanda: MaterialComanda, nouEstat: 'pendent' | 'confirmada' | 'entregada' | 'cancelada') => {
    try {
      await updateMaterialComanda(comanda.id, {
        quantitat: comanda.quantitat,
        talla: comanda.talla,
        estat: nouEstat
      })
      showToast(`Comanda ${nouEstat}`)
      loadData()
    } catch (err) {
      showToast('Error actualitzant estat de la comanda', 'error')
    }
  }

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter(o => o.estat === statusFilter)
  }, [orders, statusFilter])

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Equipament i Material del Club</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Samarretes tècniques, monomons de triatló, dessuadores i roba oficial del club.
            </p>
          </div>
        </div>

        {isCoach && (
          <button
            onClick={() => setCreateProductOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nou Producte
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catàleg de Productes</span>
          {products.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'catalog' ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-700'
            }`}>
              {products.length}
            </span>
          )}
        </button>

        {isCoach && (
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Gestió de Comandes</span>
            {orders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'orders' ? 'bg-white text-brand-600' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {orders.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === 'catalog' && (
        <div>
          {loading ? (
            <div className="glass-card p-12 text-center text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
              <p className="text-sm font-semibold">Carregant catàleg de material...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card p-12 text-center text-text-muted">
              <Package className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
              <h3 className="text-base font-bold text-text-primary">Cap producte disponible</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                No hi ha peces de roba o material a la botiga en aquests moments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(prod => (
                <div 
                  key={prod.id} 
                  className="glass-card p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-brand-400 hover:shadow-md transition-all group overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="h-44 -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 bg-bg-surface overflow-hidden relative flex items-center justify-center border-b border-border">
                      {prod.imatge_url ? (
                        <img 
                          src={prod.imatge_url} 
                          alt={prod.nom} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-text-muted/30" />
                      )}
                      <span className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-sm text-text-primary text-sm font-black shadow-sm">
                        {prod.preu} €
                      </span>
                    </div>

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-text-primary group-hover:text-brand-600 transition-colors">
                          {prod.nom}
                        </h3>
                        {isCoach && (
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="text-text-muted hover:text-rose-600 p-1 transition-colors"
                            title="Eliminar producte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {prod.descripcio && (
                        <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                          {prod.descripcio}
                        </p>
                      )}
                    </div>

                    {/* Sizes chips */}
                    {prod.talles && prod.talles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-text-muted mr-1">Talles:</span>
                        {prod.talles.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-bg-surface text-text-primary text-[11px] font-bold border border-border">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border">
                    <button
                      onClick={() => {
                        setSelectedProductForOrder(prod)
                        setSelectedSize(prod.talles?.[0] || 'M')
                        setOrderQuantity(1)
                        setOrderNotes('')
                      }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Demanar aquest producte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders (Coach View) */}
      {activeTab === 'orders' && isCoach && (
        <div className="space-y-4">
          <div className="glass-card p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-secondary">Filtrar per estat:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Totes les comandes</option>
                <option value="pendent">Pendent</option>
                <option value="confirmada">Confirmada</option>
                <option value="entregada">Entregada</option>
                <option value="cancelada">Cancel·lada</option>
              </select>
            </div>

            <span className="text-text-muted font-bold">
              {filteredOrders.length} comandes trobades
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-card p-12 text-center text-text-muted">
              <ShoppingBag className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
              <h3 className="text-base font-bold text-text-primary">Cap comanda registrada</h3>
              <p className="text-xs text-text-muted mt-1">
                Les sol·licituds d'equipament dels atletes apareixeran aquí.
              </p>
            </div>
          ) : (
            <div className="glass-card divide-y divide-border overflow-hidden">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-bg-hover/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">
                        {order.producte_nom || 'Producte'}
                      </span>
                      {order.talla && (
                        <span className="px-2 py-0.5 rounded-md bg-bg-surface text-text-primary text-xs font-black border border-border">
                          Talla: {order.talla}
                        </span>
                      )}
                      <span className="text-xs text-text-muted font-medium">
                        x{order.quantitat} unitats
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1 font-semibold text-text-secondary">
                        <User className="w-3.5 h-3.5 text-brand-500" />
                        {order.atleta_nom || 'Atleta'}
                      </span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString('ca-ES')}</span>
                    </div>

                    {order.notes && (
                      <p className="text-xs text-text-muted italic bg-bg-surface p-2 rounded-lg border border-border mt-1">
                        "{order.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      order.estat === 'entregada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      order.estat === 'confirmada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      order.estat === 'cancelada' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {order.estat}
                    </span>

                    <select
                      value={order.estat}
                      onChange={e => handleUpdateOrderStatus(order, e.target.value as any)}
                      className="px-2 py-1 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="pendent">Pendent</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="entregada">Entregada</option>
                      <option value="cancelada">Cancel·lada</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Demanar Producte */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-500" />
                Demanar {selectedProductForOrder.nom}
              </h3>
              <button onClick={() => setSelectedProductForOrder(null)} className="text-text-muted hover:text-text-primary p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Selecciona la Talla
                </label>
                <div className="flex flex-wrap gap-2">
                  {(selectedProductForOrder.talles || ['S', 'M', 'L', 'XL']).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedSize(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedSize === t 
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm' 
                          : 'bg-bg-base text-text-secondary border-border hover:bg-bg-hover'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Quantitat
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={orderQuantity}
                  onChange={e => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Notes o indicacions especials (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Entregar abans de la cursa del diumenge..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-bg-base border border-border flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Preu total aproximat:</span>
                <strong className="text-sm font-black text-brand-600">
                  {selectedProductForOrder.preu * orderQuantity} €
                </strong>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={orderingLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {orderingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirmar Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Producte */}
      {createProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-500" />
                Afegir Nou Producte de Material
              </h3>
              <button onClick={() => setCreateProductOpen(false)} className="text-text-muted hover:text-text-primary p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Nom del producte <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Samarreta Tècnica Club 2026"
                  value={productForm.nom}
                  onChange={e => setProductForm(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Preu (€) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={productForm.preu}
                    onChange={e => setProductForm(prev => ({ ...prev, preu: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Talles (separades per coma)
                  </label>
                  <input
                    type="text"
                    value={productForm.talles}
                    onChange={e => setProductForm(prev => ({ ...prev, talles: e.target.value }))}
                    placeholder="S, M, L, XL"
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Descripció o composició
                </label>
                <textarea
                  rows={3}
                  value={productForm.descripcio}
                  onChange={e => setProductForm(prev => ({ ...prev, descripcio: e.target.value }))}
                  placeholder="Material transpirable, tallatge unisex, cremallera frontal..."
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Fotografia del producte
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files && setProductImage(e.target.files[0])}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateProductOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct || !productForm.nom.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submittingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Afegir al Catàleg
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
