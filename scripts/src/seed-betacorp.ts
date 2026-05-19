import { db } from "@workspace/db";
import {
  employeesTable,
  dependentsTable,
  activityLogTable,
  employersTable,
} from "@workspace/db";

// ---------- BetaCorp census from employee_census_dummy_BetaCorp.xlsx ----------
// Situs Zip: 95833 (Sacramento, CA), SIC 8731 (Commercial Physical & Biological Research)

const EMPLOYER = {
  name: "BetaCorp",
  ein: "68-0000831",
  industry: "Commercial Physical & Biological Research",
  city: "Sacramento",
  state: "CA",
  zip: "95833",
  contactName: "HR Administrator",
  contactEmail: "hr@betacorp.com",
};

function toStatus(eligibility: string): "active" | "inactive" {
  if (eligibility.startsWith("<20")) return "inactive";
  return "active";
}

function toJobTitle(eligibility: string): string {
  if (eligibility.startsWith("30+")) return "Full-Time Employee";
  if (eligibility.startsWith("20-29")) return "Part-Time Employee";
  return "Ineligible";
}

// MM/DD/YYYY → YYYY-MM-DD
function parseDob(raw: string): string {
  const [m, d, y] = raw.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function toRelationship(raw: string): string {
  const r = raw.toLowerCase().trim();
  if (r === "spouse") return "spouse";
  if (r === "child") return "child";
  if (r.includes("domestic")) return "domestic_partner";
  return r;
}

const EMPLOYEES: {
  employeeId: string;
  lastName: string;
  firstName: string;
  email: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  dateOfBirth: string;
  eligibility: string;
  annualSalary: number;
  dependents: { name: string; dob: string; relationship: string }[];
}[] = [
  {
    employeeId: "EMP8309",
    lastName: "Okafor",
    firstName: "Wren",
    email: "wren.okafor@betacorp.com",
    city: "Burbank",
    state: "CA",
    zip: "91501",
    county: "Los Angeles",
    dateOfBirth: parseDob("04/05/1976"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 34000,
    dependents: [
      { name: "Isla Okafor", dob: parseDob("10/16/2007"), relationship: "child" },
      { name: "Miles Okafor", dob: parseDob("12/20/2018"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9820",
    lastName: "Petrov",
    firstName: "Sloane",
    email: "sloane.petrov@betacorp.com",
    city: "El Segundo",
    state: "CA",
    zip: "90245",
    county: "Los Angeles",
    dateOfBirth: parseDob("03/15/1975"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 44000,
    dependents: [],
  },
  {
    employeeId: "EMP9331",
    lastName: "Delgado",
    firstName: "Emery",
    email: "emery.delgado@betacorp.com",
    city: "Torrance",
    state: "CA",
    zip: "90501",
    county: "Los Angeles",
    dateOfBirth: parseDob("01/09/1987"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 39500,
    dependents: [],
  },
  {
    employeeId: "EMP9377",
    lastName: "Yamamoto",
    firstName: "Emery",
    email: "emery.yamamoto@betacorp.com",
    city: "Glendale",
    state: "CA",
    zip: "91201",
    county: "Los Angeles",
    dateOfBirth: parseDob("08/02/2000"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 75000,
    dependents: [
      { name: "Luna Yamamoto", dob: parseDob("10/06/2019"), relationship: "child" },
      { name: "Isla Yamamoto", dob: parseDob("01/04/2010"), relationship: "child" },
      { name: "Aria Yamamoto", dob: parseDob("08/22/2010"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP8432",
    lastName: "Osei",
    firstName: "Emery",
    email: "emery.osei@betacorp.com",
    city: "Pasadena",
    state: "CA",
    zip: "91101",
    county: "Los Angeles",
    dateOfBirth: parseDob("05/20/1971"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 90000,
    dependents: [],
  },
  {
    employeeId: "EMP8320",
    lastName: "Kim",
    firstName: "Sloane",
    email: "sloane.kim@betacorp.com",
    city: "Glendale",
    state: "CA",
    zip: "91201",
    county: "Los Angeles",
    dateOfBirth: parseDob("05/18/1990"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 64000,
    dependents: [
      { name: "Kai Kim", dob: parseDob("03/24/2006"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9912",
    lastName: "Haddad",
    firstName: "Kendall",
    email: "kendall.haddad@betacorp.com",
    city: "El Segundo",
    state: "CA",
    zip: "90245",
    county: "Los Angeles",
    dateOfBirth: parseDob("02/04/1969"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 70000,
    dependents: [
      { name: "Luna Haddad", dob: parseDob("09/11/1978"), relationship: "domestic_partner" },
      { name: "Kai Haddad", dob: parseDob("05/04/2012"), relationship: "child" },
      { name: "Leo Haddad", dob: parseDob("11/03/2010"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9106",
    lastName: "Nguyen",
    firstName: "Tatum",
    email: "tatum.nguyen@betacorp.com",
    city: "Santa Monica",
    state: "CA",
    zip: "90401",
    county: "Los Angeles",
    dateOfBirth: parseDob("04/13/1983"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 99000,
    dependents: [
      { name: "Isla Nguyen", dob: parseDob("03/02/1970"), relationship: "domestic_partner" },
    ],
  },
  {
    employeeId: "EMP8055",
    lastName: "Yamamoto",
    firstName: "Wren",
    email: "wren.yamamoto@betacorp.com",
    city: "Glendale",
    state: "CA",
    zip: "91201",
    county: "Los Angeles",
    dateOfBirth: parseDob("11/08/1981"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 35500,
    dependents: [],
  },
  {
    employeeId: "EMP7571",
    lastName: "Kowalski",
    firstName: "Sloane",
    email: "sloane.kowalski@betacorp.com",
    city: "El Segundo",
    state: "CA",
    zip: "90245",
    county: "Los Angeles",
    dateOfBirth: parseDob("08/25/1980"),
    eligibility: "<20 Hours (Ineligible)",
    annualSalary: 34000,
    dependents: [
      { name: "Finn Kowalski", dob: parseDob("05/22/1997"), relationship: "domestic_partner" },
    ],
  },
  {
    employeeId: "EMP7626",
    lastName: "Mbeki",
    firstName: "Brecken",
    email: "brecken.mbeki@betacorp.com",
    city: "Burbank",
    state: "CA",
    zip: "91501",
    county: "Los Angeles",
    dateOfBirth: parseDob("07/10/1978"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 68000,
    dependents: [],
  },
  {
    employeeId: "EMP9950",
    lastName: "Yamamoto",
    firstName: "Vesper",
    email: "vesper.yamamoto@betacorp.com",
    city: "Glendale",
    state: "CA",
    zip: "91201",
    county: "Los Angeles",
    dateOfBirth: parseDob("06/07/1986"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 93000,
    dependents: [
      { name: "Luna Yamamoto", dob: parseDob("11/14/1981"), relationship: "spouse" },
      { name: "Miles Yamamoto", dob: parseDob("06/22/2018"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP8275",
    lastName: "Rivera",
    firstName: "Blake",
    email: "blake.rivera@betacorp.com",
    city: "Glendale",
    state: "CA",
    zip: "91201",
    county: "Los Angeles",
    dateOfBirth: parseDob("09/10/1962"),
    eligibility: "<20 Hours (Ineligible)",
    annualSalary: 31500,
    dependents: [
      { name: "Kai Rivera", dob: parseDob("05/24/2011"), relationship: "child" },
      { name: "Nora Rivera", dob: parseDob("09/17/2019"), relationship: "child" },
      { name: "River Rivera", dob: parseDob("04/24/2014"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP5168",
    lastName: "Ferreira",
    firstName: "Rowan",
    email: "rowan.ferreira@betacorp.com",
    city: "Pasadena",
    state: "CA",
    zip: "91101",
    county: "Los Angeles",
    dateOfBirth: parseDob("01/02/1999"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 95000,
    dependents: [
      { name: "River Ferreira", dob: parseDob("05/07/2023"), relationship: "child" },
      { name: "Finn Ferreira", dob: parseDob("07/26/2017"), relationship: "child" },
      { name: "Luna Ferreira", dob: parseDob("08/11/2013"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP6052",
    lastName: "Yamamoto",
    firstName: "Kendall",
    email: "kendall.yamamoto@betacorp.com",
    city: "El Segundo",
    state: "CA",
    zip: "90245",
    county: "Los Angeles",
    dateOfBirth: parseDob("09/23/1988"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 80000,
    dependents: [],
  },
  {
    employeeId: "EMP8794",
    lastName: "Hassan",
    firstName: "Indigo",
    email: "indigo.hassan@betacorp.com",
    city: "Burbank",
    state: "CA",
    zip: "91501",
    county: "Los Angeles",
    dateOfBirth: parseDob("10/21/1992"),
    eligibility: "<20 Hours (Ineligible)",
    annualSalary: 27500,
    dependents: [
      { name: "Isla Hassan", dob: parseDob("08/17/1980"), relationship: "spouse" },
      { name: "Aria Hassan", dob: parseDob("06/26/2008"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9047",
    lastName: "Dubois",
    firstName: "Emery",
    email: "emery.dubois@betacorp.com",
    city: "Santa Monica",
    state: "CA",
    zip: "90401",
    county: "Los Angeles",
    dateOfBirth: parseDob("11/18/1998"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 49000,
    dependents: [
      { name: "Zoe Dubois", dob: parseDob("03/19/1975"), relationship: "domestic_partner" },
      { name: "Aria Dubois", dob: parseDob("01/02/2017"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP7804",
    lastName: "Kowalski",
    firstName: "Shea",
    email: "shea.kowalski@betacorp.com",
    city: "Long Beach",
    state: "CA",
    zip: "90801",
    county: "Los Angeles",
    dateOfBirth: parseDob("08/02/1972"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 39000,
    dependents: [],
  },
  {
    employeeId: "EMP6544",
    lastName: "Delgado",
    firstName: "Rowan",
    email: "rowan.delgado@betacorp.com",
    city: "Burbank",
    state: "CA",
    zip: "91501",
    county: "Los Angeles",
    dateOfBirth: parseDob("05/22/1979"),
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 119000,
    dependents: [
      { name: "Luna Delgado", dob: parseDob("11/27/2016"), relationship: "child" },
      { name: "Isla Delgado", dob: parseDob("12/22/2007"), relationship: "child" },
      { name: "Finn Delgado", dob: parseDob("03/05/2009"), relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9467",
    lastName: "Kim",
    firstName: "Emery",
    email: "emery.kim@betacorp.com",
    city: "El Segundo",
    state: "CA",
    zip: "90245",
    county: "Los Angeles",
    dateOfBirth: parseDob("06/28/1972"),
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 33000,
    dependents: [
      { name: "Luna Kim", dob: parseDob("01/11/2015"), relationship: "child" },
      { name: "Nora Kim", dob: parseDob("05/06/2011"), relationship: "child" },
    ],
  },
];

async function main() {
  console.log("🏢 Inserting employer: BetaCorp...");
  const [employer] = await db
    .insert(employersTable)
    .values(EMPLOYER)
    .returning();
  console.log(`   Employer ID: ${employer.id}`);

  console.log(`👥 Inserting ${EMPLOYEES.length} employees...`);
  let empCount = 0;
  let depCount = 0;

  for (const empData of EMPLOYEES) {
    const { dependents, ...empFields } = empData;

    const [employee] = await db
      .insert(employeesTable)
      .values({
        employerId: employer.id,
        employeeId: empFields.employeeId,
        firstName: empFields.firstName,
        lastName: empFields.lastName,
        email: empFields.email,
        city: empFields.city,
        state: empFields.state,
        zip: empFields.zip,
        dateOfBirth: empFields.dateOfBirth,
        status: toStatus(empFields.eligibility),
        jobTitle: toJobTitle(empFields.eligibility),
        department: "General",
        invitationStatus: "not_invited",
      })
      .returning();

    empCount++;

    for (const dep of dependents) {
      const parts = dep.name.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || empFields.lastName;

      await db.insert(dependentsTable).values({
        employeeId: employee.id,
        firstName,
        lastName,
        relationship: toRelationship(dep.relationship),
        dateOfBirth: dep.dob,
        status: "active",
      });
      depCount++;
    }
  }

  await db.insert(activityLogTable).values({
    type: "census_upload",
    description: `Census imported for BetaCorp — ${empCount} employees loaded`,
    relatedId: employer.id,
  });

  console.log(`✅ Done! Inserted ${empCount} employees and ${depCount} dependents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
