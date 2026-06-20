import mongoose from "mongoose";

const designationHistorySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, index: true },
    oldDesignation: { type: String, required: true, trim: true },
    newDesignation: { type: String, required: true, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

designationHistorySchema.index({ employeeId: 1, changedAt: -1 });

export const DesignationHistory =
  mongoose.models.DesignationHistory ?? mongoose.model("DesignationHistory", designationHistorySchema);
