import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, trim: true, index: true },
  fromDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  toDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  days: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, trim: true },
  reasonType: { type: String, required: false, trim: true },
  customReason: { type: String, required: false, trim: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
    index: true,
  },
  source: {
    type: String,
    enum: ["Manual", "Email"],
    default: "Manual",
    index: true,
  },
  // Analysis fields (optional snapshot stored at creation time)
  latestLeaveDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: false },
  leavesUsedThisMonth: { type: Number, required: false, min: 0 },
  remainingLeaves: { type: Number, required: false },
  totalAfterApproval: { type: Number, required: false },
  recommendation: { type: String, enum: ["APPROVE", "REJECT"], required: false },
  createdAt: { type: Date, default: Date.now },
});

leaveRequestSchema.index({ employeeId: 1, fromDate: -1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

leaveRequestSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const LeaveRequest =
  mongoose.models.LeaveRequest ?? mongoose.model("LeaveRequest", leaveRequestSchema);
