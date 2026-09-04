import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function FiscalReceipt({ receipt, onClose }) {
  if (!receipt) return null;

  // Fiscal receipt details
  const companyName = 'DISKONT PIĆA MARKO DOO';
  const address = 'Bulevar Nemanjića 15, Niš';
  const pib = '109876543';
  const mb = '20987654';
  const pfrReceiptNumber = receipt.receiptNumber || `860001-860001-${Date.now().toString().slice(-6)}`;
  const pfrDateTime = new Date().toLocaleString('sr-RS');
  
  // Verification URL mock for Serbian Tax Authority (SUF)
  const verificationUrl = `https://suf.purs.gov.rs/v/?vl=${pfrReceiptNumber}&t=20260904T155000&a=${receipt.totalAmount}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-md w-full flex flex-col items-center max-h-[90vh] overflow-y-auto">
        
        {/* Thermal Receipt Print Area */}
        <div id="printable-receipt" className="bg-white text-black p-6 rounded-md w-[320px] font-mono text-xs shadow-2xl leading-tight select-none">
          {/* Header */}
          <div className="text-center font-bold text-sm uppercase border-b border-dashed border-black pb-2 mb-2">
            <p>{companyName}</p>
            <p className="font-normal text-[11px] mt-0.5">{address}</p>
            <p className="font-normal text-[10px] mt-0.5">PIB: {pib} | MB: {mb}</p>
            <p className="font-semibold text-[11px] mt-1 text-slate-800">ESIR POS Terminal 01</p>
          </div>

          <div className="text-center font-bold my-2 text-[13px] tracking-wider border-b border-dashed border-black pb-2">
            === FISKALNI RAČUN ===
          </div>

          {/* Purchased Items Table */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
            <div className="flex justify-between font-bold border-b border-black/20 pb-1 mb-1 text-[10px]">
              <span>Artikal / Količina</span>
              <span>Iznos (RSD)</span>
            </div>
            
            {receipt.items && receipt.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="pr-2">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-[10px] text-gray-600">
                    {item.quantityUnits} x {parseFloat(item.unitPriceApplied).toFixed(2)} [Đ]
                  </p>
                </div>
                <span className="font-bold whitespace-nowrap">{parseFloat(item.totalPrice).toFixed(2)}</span>
              </div>
            ))}

            {/* Deposits & Returned Packaging */}
            {receipt.depositItems && receipt.depositItems.map((dItem, idx) => (
              <div key={`dep-${idx}`} className="flex justify-between items-start text-gray-800">
                <div className="pr-2">
                  <p className="font-bold">{dItem.type === 'RETURN' ? 'Povraćaj: ' : 'Kaucija: '}{dItem.name}</p>
                  <p className="text-[10px]">
                    {dItem.quantity} x {parseFloat(dItem.depositPrice).toFixed(2)} [E]
                  </p>
                </div>
                <span className="font-bold whitespace-nowrap">
                  {dItem.type === 'RETURN' ? '-' : ''}{(dItem.quantity * parseFloat(dItem.depositPrice)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Tax Breakdown */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Ukupan iznos:</span>
              <span className="font-bold text-xs">{parseFloat(receipt.totalAmount).toFixed(2)} RSD</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Đ - PDV 20%:</span>
              <span>{parseFloat(receipt.totalVat || 0).toFixed(2)} RSD</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>E - Oslobođeno PDV-a:</span>
              <span>0.00 RSD</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Način plaćanja:</span>
              <span>{receipt.paymentMethod || 'GOTOVINA'}</span>
            </div>
          </div>

          {/* PFR Fiscal Metadata */}
          <div className="text-[9px] text-gray-700 space-y-0.5 mb-3 border-b border-dashed border-black pb-2">
            <p>PFR Broj računа: <span className="font-bold">{pfrReceiptNumber}</span></p>
            <p>PFR Vreme: <span className="font-bold">{pfrDateTime}</span></p>
            <p>Brojač računa: <span className="font-bold">124/12431PR</span></p>
          </div>

          {/* Verification QR Code */}
          <div className="flex flex-col items-center justify-center pt-1">
            <QRCodeSVG value={verificationUrl} size={110} level="M" />
            <p className="text-[8px] text-gray-500 mt-1 uppercase font-semibold">Skenirajte QR kod za proveru računa</p>
            <p className="text-[9px] font-bold mt-1 text-center">=== KRAJ FISKALNOG RAČUNA ===</p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-3 w-full mt-6 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg"
          >
            Štampaj Račun [Enter]
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
          >
            Zatvori [Esc]
          </button>
        </div>
      </div>
    </div>
  );
}