export const employeeCountExcludedStations = ["TI/HX"].map((stationName) =>
  stationName.trim().toUpperCase(),
);

export const stationCountExcludedStations = ["TI/HX"].map((stationName) =>
  stationName.trim().toUpperCase(),
);

export function isEmployeeCountExcludedStation(stationName) {
  return employeeCountExcludedStations.includes(String(stationName ?? "").trim().toUpperCase());
}

export function isStationCountExcludedStation(stationName) {
  return stationCountExcludedStations.includes(String(stationName ?? "").trim().toUpperCase());
}
