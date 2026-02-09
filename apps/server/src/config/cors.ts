const defaultOrigins = [
  "http://localhost:19006",
  "http://localhost:19000",
  "http://localhost:3000",
];

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length ? configuredOrigins : defaultOrigins;
};
