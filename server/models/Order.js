import { Schema, model } from 'mongoose';

const ORDER_STATUSES = ['pendiente_pago', 'pago_confirmado', 'en_preparacion', 'entregado', 'cancelado'];

const itemSchema = new Schema(
  {
    type: { type: String, enum: ['product', 'promotion'], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true }, // snapshot
    code: { type: String, default: '' }, // snapshot
    supplier: { type: String, default: '' }, // snapshot (marca)
    unitPrice: { type: Number, required: true }, // snapshot (precio cobrado, con descuento)
    listPrice: { type: Number, default: null }, // precio de lista antes del descuento
    discountPercent: { type: Number, default: 0 },
    promotionTitle: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
    priceToConfirm: { type: Boolean, default: false }, // se pidió sin precio cargado
    stockTracked: { type: Boolean, default: true }, // false: sin stock cargado, no se descontó
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true }, // suma de lo que tiene precio
    pricePending: { type: Boolean, default: false }, // hay productos con precio a confirmar
    notes: { type: String, default: '' }, // del cliente
    internalNotes: { type: String, default: '' }, // solo admin
    status: { type: String, enum: ORDER_STATUSES, default: 'pendiente_pago', index: true },
    statusHistory: [{ status: String, date: { type: Date, default: Date.now }, note: { type: String, default: '' }, _id: false }],
    // Pago confirmado solo, al tocar "Enviar comprobante por WhatsApp": queda para verificar en el panel
    autoConfirmed: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customerSnapshot.phone': 1 });

export default model('Order', orderSchema);
export { ORDER_STATUSES };
