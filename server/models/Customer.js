import { Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true }, // 549XXXXXXXXXX
    name: { type: String, required: true, trim: true },
    pinHash: { type: String, required: true, select: false },
    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    // Preparado para el futuro: validación por código OTP (WhatsApp/SMS). No se usa todavía.
    phoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model('Customer', customerSchema);
