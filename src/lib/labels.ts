/** Display labels for enum-like string columns. Client-safe (no DB imports). */

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  HOTEL: "Hotel",
  APARTMENT: "Apartment",
  HOUSE: "House",
  ROOM: "Private room",
};

export const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wi-Fi",
  kitchen: "Kitchen",
  air_conditioning: "Air conditioning",
  washer: "Washer",
  parking: "Free parking",
  pool: "Pool",
  gym: "Gym",
  breakfast: "Breakfast included",
  pets_allowed: "Pets allowed",
  workspace: "Dedicated workspace",
};
