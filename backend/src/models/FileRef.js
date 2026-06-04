import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const fileSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    storage_path: { type: String, index: true },
    original_filename: String,
    content_type: String,
    size: Number,
    owner_id: String,
    is_deleted: { type: Boolean, default: false },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'files' },
);

export default mongoose.model('FileRef', fileSchema);
