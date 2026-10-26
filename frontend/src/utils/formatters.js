export const statusLabels = ["None", "Awaiting payment", "Awaiting review", "Approved", "Rejected", "Cancelled"];
export const short = value => typeof value === "string" && value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
export const number = value => Number(value || 0).toLocaleString();
export const date = value => value ? new Date(Number(value) * 1000).toLocaleDateString() : "—";
