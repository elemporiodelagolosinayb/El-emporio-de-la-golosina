import { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true }, // ej: "order"
  seq: { type: Number, default: 0 },
});

const Counter = model('Counter', counterSchema);

/** Incrementa y devuelve el siguiente número de forma atómica */
Counter.next = async function next(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

export default Counter;
