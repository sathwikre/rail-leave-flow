import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    stationName: { type: String, required: true, trim: true },
    dob: { type: Date },
    doa: { type: Date },
    doj: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

employeeSchema.index({ stationName: 1, employeeId: 1 });
employeeSchema.index({ name: "text", employeeId: "text", phone: "text" });

employeeSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret.employeeId;
    delete ret._id;
    return ret;
  },
});

export const Employee = mongoose.models.Employee ?? mongoose.model("Employee", employeeSchema);
