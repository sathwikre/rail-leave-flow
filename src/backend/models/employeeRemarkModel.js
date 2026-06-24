import mongoose from "mongoose";

const employeeRemarkSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, trim: true, index: true },
  remarkType: {
    type: String,
    enum: ["Excellent", "Good", "General", "Warning", "Disciplinary"],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  addedBy: { type: String, required: true, trim: true, default: "Traffic Inspector" },
  createdAt: { type: Date, default: Date.now },
});

employeeRemarkSchema.index({ employeeId: 1, date: -1, createdAt: -1 });

employeeRemarkSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const EmployeeRemark =
  mongoose.models.EmployeeRemark ?? mongoose.model("EmployeeRemark", employeeRemarkSchema);
