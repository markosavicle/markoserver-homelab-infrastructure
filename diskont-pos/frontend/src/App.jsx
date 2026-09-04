import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Barcode, Trash2, CheckCircle2, AlertTriangle, Search, Package, RefreshCw, PlusCircle, MinusCircle } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [packagings, setPackagings] = useState([]);
  const [cart, setCart] = useState([]);
  const [depositCart, setDepositCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const barcodeRef = useRef(null);

  const fetchData = async () => {
    try {
      const [prodRes, packRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/packaging')
      ]);
      const prodData = await prodRes.json();
      const packData = await packRes.json();
      setProducts(prodData);
      setPackagings(packData);
    } catch (err) {
      setError('Failed to fetch initial store data');
    }
  };

  useEffect(() => {
    fetchData();
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  const addToCart = (product, quantityUnits = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantityUnits: item.quantityUnits + quantityUnits }
            : item
        );
      }
      return [...prevCart, { product, quantityUnits }];
    });
  };

  const handleAddDeposit = (packaging, type) => {
    setDepositCart((prev) => {
      const existing = prev.find((item) => item.packaging.id === packaging.id && item.type === type);
      if (existing) {
        return prev.map((item) =>
          item.packaging.id === packaging.id && item.type === type
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { packaging, quantity: 1, type }];
    });
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput) return;

    try {
      const res = await fetch(`/api/products/barcode/${barcodeInput}`);
      if (!res.ok) throw new Error('Product not found');
      const product = await res.json();
      addToCart(product, 1);
      setBarcodeInput('');
      setError(null);
    } catch (err) {
      setError(`Barcode ${barcodeInput} not recognized`);
      setBarcodeInput('');
    }
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const removeDepositFromCart = (packagingId, type) => {
    setDepositCart((prev) => prev.filter((item) => !(item.packaging.id === packagingId && item.type === type)));
  };

  const calculateTotal = () => {
    const productsTotal = cart.reduce((total, item) => {
      const { product, quantityUnits } = item;
      if (product.pack_price && product.units_in_pack > 1 && quantityUnits >= product.units_in_pack) {
        const fullPacks = Math.floor(quantityUnits / product.units_in_pack);
        const remainderUnits = quantityUnits % product.units_in_pack;
        return total + (fullPacks * parseFloat(product.pack_price)) + (remainderUnits * parseFloat(product.unit_price));
      }
      return total + (quantityUnits * parseFloat(product.unit_price));
    }, 0);

    const depositTotal = depositCart.reduce((total, item) => {
      const price = parseFloat(item.packaging.deposit_price) * item.quantity;
      return item.type === 'RETURN' ? total - price : total + price;
    }, 0);

    return productsTotal + depositTotal;
  };

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0 && depositCart.length === 0) return;

    const payload = {
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantityUnits: item.quantityUnits,
      })),
      depositItems: depositCart.map((item) => ({
        packagingId: item.packaging.id,
        quantity: item.quantity,
        type: item.type,
      })),
    };

    try {
      const res = await fetch('/api/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReceipt(data);
      setCart([]);
      setDepositCart([]);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Left Panel: Catalog, Packaging & Barcode */}
      <div className="w-2/3 flex flex-col border-r border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-black tracking-wider text-white">DISKONT PIĆA POS</h1>
          </div>
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2 w-1/2">
            <div className="relative w-full">
              <Barcode className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Scan Barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Deposit Quick Actions Bar */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Deposits & Packaging Actions
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {packagings.map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-semibold text-white">{pkg.name} ({pkg.deposit_price} RSD)</span>
                <button
                  onClick={() => handleAddDeposit(pkg, 'ADD')}
                  className="bg-emerald-950 text-emerald-400 hover:bg-emerald-900 p-1 rounded border border-emerald-800/50 transition"
                  title="Charge Deposit"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAddDeposit(pkg, 'RETURN')}
                  className="bg-amber-950 text-amber-400 hover:bg-amber-900 p-1 rounded border border-amber-800/50 transition"
                  title="Return Packaging"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search catalog by product name or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-3 gap-3.5 overflow-y-auto pr-2 flex-1 auto-rows-max">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => addToCart(p, 1)}
              className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 cursor-pointer transition flex flex-col justify-between shadow-lg group"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                  {p.category_name}
                </span>
                <h3 className="font-semibold text-sm text-white mt-1.5 group-hover:text-emerald-300 transition">{p.name}</h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-between items-end">
                <div>
                  <span className="text-emerald-400 font-bold text-base">{p.unit_price} RSD</span>
                  {p.pack_price && (
                    <p className="text-[11px] text-slate-400 font-medium">Pack ({p.units_in_pack}x): {p.pack_price} RSD</p>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.stock_units < p.min_stock_units ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  Stock: {p.stock_units}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Cart & Checkout */}
      <div className="w-1/3 flex flex-col p-6 bg-slate-900 justify-between border-l border-slate-800">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <ShoppingCart className="text-emerald-400 w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Current Cart</h2>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1">
              {cart.length === 0 && depositCart.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Cart is empty. Scan barcode or add items/deposits.</p>
                </div>
              ) : (
                <>
                  {/* Regular Products */}
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <h4 className="font-semibold text-white text-xs">{item.product.name}</h4>
                        <p className="text-[11px] text-emerald-400 font-medium mt-0.5">{item.product.unit_price} RSD / unit</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantityUnits}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setCart(cart.map(c => c.product.id === item.product.id ? {...c, quantityUnits: val} : c));
                          }}
                          className="w-10 text-center bg-slate-800 text-white font-bold text-xs py-1 rounded border border-slate-700 focus:outline-none"
                        />
                        <button onClick={() => removeFromCart(item.product.id)} className="text-slate-500 hover:text-red-400 transition p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Deposits & Returns */}
                  {depositCart.map((dItem) => (
                    <div key={`${dItem.packaging.id}-${dItem.type}`} className={`flex justify-between items-center p-3 rounded-xl border ${dItem.type === 'RETURN' ? 'bg-amber-950/30 border-amber-800/40' : 'bg-slate-950 border-slate-800/80'}`}>
                      <div>
                        <h4 className="font-semibold text-xs text-white">
                          {dItem.type === 'RETURN' ? 'Returned: ' : 'Deposit: '} {dItem.packaging.name}
                        </h4>
                        <p className={`text-[11px] font-bold mt-0.5 ${dItem.type === 'RETURN' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {dItem.type === 'RETURN' ? '-' : '+'}{dItem.packaging.deposit_price} RSD
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={dItem.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setDepositCart(depositCart.map(d => d.packaging.id === dItem.packaging.id && d.type === dItem.type ? {...d, quantity: val} : d));
                          }}
                          className="w-10 text-center bg-slate-800 text-white font-bold text-xs py-1 rounded border border-slate-700 focus:outline-none"
                        />
                        <button onClick={() => removeDepositFromCart(dItem.packaging.id, dItem.type)} className="text-slate-500 hover:text-red-400 transition p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="border-t border-slate-800 pt-4 mt-auto">
            <div className="flex justify-between text-2xl font-black mb-6 text-white">
              <span>Total:</span>
              <span className="text-emerald-400">{calculateTotal().toFixed(2)} RSD</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleCheckout('CASH')}
                disabled={cart.length === 0 && depositCart.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl disabled:opacity-30 disabled:hover:bg-emerald-600 text-white shadow-lg transition"
              >
                Pay Cash
              </button>
              <button
                onClick={() => handleCheckout('CARD')}
                disabled={cart.length === 0 && depositCart.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl disabled:opacity-30 disabled:hover:bg-blue-600 text-white shadow-lg transition"
              >
                Pay Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-md w-full text-center shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-1">Sale Complete</h2>
            <p className="text-slate-400 text-xs mb-6 font-mono">Receipt: {receipt.receiptNumber}</p>
            <div className="bg-slate-950 p-4 rounded-xl mb-6 text-left border border-slate-800">
              <div className="flex justify-between mb-2 text-base">
                <span className="text-slate-300">Total Paid:</span>
                <span className="font-bold text-emerald-400">{receipt.totalAmount} RSD</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-2">
                <span>Included VAT (20%):</span>
                <span>{receipt.totalVat.toFixed(2)} RSD</span>
              </div>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white transition shadow-lg"
            >
              Next Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}