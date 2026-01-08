export const PER_PAGE = 5;

export const userTypes = [
  "super admin",
  "admin",
  "budget officer",
  "accounting officer",
  "bac chairperson",
  "bac member",
  "schools division superintendent",
  "supply officer - division",
  "supply officer - school",
  "section chief",
  "division staff",
] as const;

export type UserType = (typeof userTypes)[number];

export const billingAgencies = [
  "DEPARTMENT OF SOCIAL WELFARE AND DEVELOPMENT (DSWD)",
  "LGU - SAN FRANCISCO",
  "PLGU - AGUSAN DEL SUR",
];
