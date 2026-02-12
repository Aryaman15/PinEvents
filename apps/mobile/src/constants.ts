export const initialCenter: [number, number] = [-122.4194, 37.7749];
export const tokenKey = "authToken";

export const markerColorExpression = [
  "case",
  ["get", "isPrivate"],
  "#7c3aed",
  "#2563eb",
] as const;
