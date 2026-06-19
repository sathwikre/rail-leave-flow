import mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    stationName: { type: String, required: true, trim: true },
    stationMaster: { type: String, required: true, trim: true },
    totalEmployees: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

stationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Station = mongoose.models.Station ?? mongoose.model("Station", stationSchema);
