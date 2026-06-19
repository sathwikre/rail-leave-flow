import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: {
      type: String,
      required: true,
      trim: true,
      enum: ["Station Master", "Technician", "Track Maintainer", "Signal Operator"],
    },
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  },
  { timestamps: true },
);

employeeSchema.index({ stationId: 1, employeeId: 1 });
employeeSchema.index({ name: "text", employeeId: "text", phone: "text" });

employeeSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret.employeeId;
    ret.stationId = String(ret.stationId);
    delete ret._id;
    return ret;
  },
});

export const Employee = mongoose.models.Employee ?? mongoose.model("Employee", employeeSchema);
