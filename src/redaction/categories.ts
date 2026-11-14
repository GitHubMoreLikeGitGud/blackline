export const CATEGORIES = [
  "name",
  "id",
  "phone",
  "email",
  "address",
  "dob",
  "account",
  "card",
  "iban",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const RANK = {
  card: 0,
  iban: 1,
  id: 2,
  account: 3,
  email: 4,
  phone: 5,
  dob: 6,
  address: 7,
  name: 8,
  other: 9,
} as const satisfies Record<Category, number>;

export function preferCategory(left: Category, right: Category): Category {
  return RANK[left] <= RANK[right] ? left : right;
}

export function categoryLabel(category: Category): string {
  switch (category) {
    case "name":
      return "Name";
    case "id":
      return "ID number";
    case "phone":
      return "Phone";
    case "email":
      return "Email";
    case "address":
      return "Address";
    case "dob":
      return "Date of birth";
    case "account":
      return "Account";
    case "card":
      return "Card";
    case "iban":
      return "IBAN";
    case "other":
      return "Detail";
    default: {
      const exhaustive: never = category;
      throw new Error(`Unhandled category ${String(exhaustive)}`);
    }
  }
}

export function asCategory(value: unknown): Category {
  switch (value) {
    case "name":
    case "id":
    case "phone":
    case "email":
    case "address":
    case "dob":
    case "account":
    case "card":
    case "iban":
    case "other":
      return value;
    default:
      return "other";
  }
}
