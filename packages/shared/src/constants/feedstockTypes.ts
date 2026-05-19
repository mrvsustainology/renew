export const FEEDSTOCK_TYPES = [
    "Animal Dung (Cow)",
    "Water Hyacinth",
    "Mango Peels",
    "Other Organic Waste",
] as const;

export type FeedstockType = (typeof FEEDSTOCK_TYPES)[number];