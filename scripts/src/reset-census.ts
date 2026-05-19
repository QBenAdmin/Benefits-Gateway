import { db } from "@workspace/db";
import {
  employeesTable,
  dependentsTable,
  enrollmentsTable,
  enrollmentChangesTable,
  notificationsTable,
  activityLogTable,
  employersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

// ---------- Census data from Dummy_census_Ben_Enrollment.xlsx ----------

const EMPLOYER = {
  name: "Catch A Vibe",
  ein: "95-6700000",
  industry: "Computer Programming Services",
  city: "Folsom",
  state: "CA",
  zip: "95670",
  contactName: "HR Administrator",
  contactEmail: "hr@catchavibe.com",
  contactPhone: "805-555-0100",
};

// Eligibility status from spreadsheet → app status
function toStatus(eligibility: string): "active" | "inactive" {
  if (eligibility.startsWith("<20")) return "inactive";
  return "active";
}

function toJobTitle(eligibility: string): string {
  if (eligibility.startsWith("30+")) return "Full-Time Employee";
  if (eligibility.startsWith("20-29")) return "Part-Time Employee";
  return "Ineligible";
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
    employeeId: "EMP2824",
    lastName: "Martinez",
    firstName: "Jordan",
    email: "jordan.martinez@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1974-03-24",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 56000,
    dependents: [
      { name: "Noah Martinez", dob: "1979-09-20", relationship: "spouse" },
      { name: "Emma Martinez", dob: "2022-04-23", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9928",
    lastName: "Davis",
    firstName: "Dakota",
    email: "dakota.davis@catchavibe.com",
    city: "Newbury Park",
    state: "CA",
    zip: "91320",
    county: "Ventura",
    dateOfBirth: "1997-05-26",
    eligibility: "<20 Hours (Ineligible)",
    annualSalary: 34000,
    dependents: [
      { name: "Ethan Davis", dob: "2013-03-07", relationship: "child" },
      { name: "Cameron Davis", dob: "2008-02-13", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP2584",
    lastName: "Thomas",
    firstName: "Reese",
    email: "reese.thomas@catchavibe.com",
    city: "Santa Barbara",
    state: "CA",
    zip: "93101",
    county: "Santa Barbara",
    dateOfBirth: "1962-12-15",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 93000,
    dependents: [],
  },
  {
    employeeId: "EMP5803",
    lastName: "Thomas",
    firstName: "Sidney",
    email: "sidney.thomas@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1964-01-22",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 82000,
    dependents: [
      { name: "Liam Thomas", dob: "2017-05-15", relationship: "child" },
      { name: "Ethan Thomas", dob: "2010-06-12", relationship: "child" },
      { name: "Noah Thomas", dob: "2013-12-22", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP2169",
    lastName: "Garcia",
    firstName: "Sidney",
    email: "sidney.garcia@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1970-08-13",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 73000,
    dependents: [
      { name: "Emma Garcia", dob: "2012-01-26", relationship: "child" },
      { name: "Ethan Garcia", dob: "2017-05-03", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP4456",
    lastName: "Anderson",
    firstName: "Robin",
    email: "robin.anderson@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1991-07-21",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 78000,
    dependents: [],
  },
  {
    employeeId: "EMP9830",
    lastName: "Thompson",
    firstName: "Quinn",
    email: "quinn.thompson@catchavibe.com",
    city: "Moorpark",
    state: "CA",
    zip: "93021",
    county: "Ventura",
    dateOfBirth: "1997-07-12",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 62000,
    dependents: [
      { name: "Liam Thompson", dob: "1974-11-06", relationship: "spouse" },
    ],
  },
  {
    employeeId: "EMP7916",
    lastName: "Williams",
    firstName: "Sidney",
    email: "sidney.williams@catchavibe.com",
    city: "Moorpark",
    state: "CA",
    zip: "93021",
    county: "Ventura",
    dateOfBirth: "1984-10-15",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 46000,
    dependents: [
      { name: "Ethan Williams", dob: "1972-05-14", relationship: "domestic_partner" },
      { name: "Olivia Williams", dob: "2019-01-24", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP5315",
    lastName: "Garcia",
    firstName: "Logan",
    email: "logan.garcia@catchavibe.com",
    city: "Camarillo",
    state: "CA",
    zip: "93010",
    county: "Ventura",
    dateOfBirth: "1979-11-17",
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 32500,
    dependents: [
      { name: "William Garcia", dob: "1985-08-01", relationship: "spouse" },
    ],
  },
  {
    employeeId: "EMP2832",
    lastName: "Wilson",
    firstName: "Reese",
    email: "reese.wilson@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1963-04-19",
    eligibility: "<20 Hours (Ineligible)",
    annualSalary: 23000,
    dependents: [
      { name: "Isabella Wilson", dob: "2009-03-22", relationship: "child" },
      { name: "Mason Wilson", dob: "2022-03-09", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP9645",
    lastName: "Moore",
    firstName: "Sidney",
    email: "sidney.moore@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1994-12-23",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 84000,
    dependents: [
      { name: "Ethan Moore", dob: "2019-09-15", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP2982",
    lastName: "Davis",
    firstName: "Avery",
    email: "avery.davis@catchavibe.com",
    city: "Camarillo",
    state: "CA",
    zip: "93010",
    county: "Ventura",
    dateOfBirth: "1981-01-19",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 73000,
    dependents: [],
  },
  {
    employeeId: "EMP1964",
    lastName: "Williams",
    firstName: "Avery",
    email: "avery.williams@catchavibe.com",
    city: "Oxnard",
    state: "CA",
    zip: "93030",
    county: "Ventura",
    dateOfBirth: "1981-02-17",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 107000,
    dependents: [],
  },
  {
    employeeId: "EMP3167",
    lastName: "Thompson",
    firstName: "Robin",
    email: "robin.thompson@catchavibe.com",
    city: "Newbury Park",
    state: "CA",
    zip: "91320",
    county: "Ventura",
    dateOfBirth: "1975-08-26",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 57000,
    dependents: [],
  },
  {
    employeeId: "EMP8062",
    lastName: "Moore",
    firstName: "Reese",
    email: "reese.moore@catchavibe.com",
    city: "Moorpark",
    state: "CA",
    zip: "93021",
    county: "Ventura",
    dateOfBirth: "1989-12-02",
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 48500,
    dependents: [],
  },
  {
    employeeId: "EMP7596",
    lastName: "Brown",
    firstName: "Skyler",
    email: "skyler.brown@catchavibe.com",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    dateOfBirth: "1972-04-18",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 99000,
    dependents: [],
  },
  {
    employeeId: "EMP8579",
    lastName: "Perez",
    firstName: "Finley",
    email: "finley.perez@catchavibe.com",
    city: "Camarillo",
    state: "CA",
    zip: "93010",
    county: "Ventura",
    dateOfBirth: "1963-11-18",
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 30500,
    dependents: [
      { name: "Olivia Perez", dob: "2018-08-16", relationship: "child" },
      { name: "Noah Perez", dob: "2017-01-06", relationship: "child" },
      { name: "Sophia Perez", dob: "2005-07-09", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP8454",
    lastName: "Moore",
    firstName: "Drew",
    email: "drew.moore@catchavibe.com",
    city: "Newbury Park",
    state: "CA",
    zip: "91320",
    county: "Ventura",
    dateOfBirth: "1969-04-10",
    eligibility: "30+ Hours (Full-Time)",
    annualSalary: 52000,
    dependents: [
      { name: "Ethan Moore", dob: "2006-01-19", relationship: "child" },
      { name: "Mason Moore", dob: "2021-09-06", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP1931",
    lastName: "Williams",
    firstName: "Logan",
    email: "logan.williams@catchavibe.com",
    city: "Thousand Oaks",
    state: "CA",
    zip: "91360",
    county: "Ventura",
    dateOfBirth: "1964-10-03",
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 35500,
    dependents: [
      { name: "William Williams", dob: "2012-10-20", relationship: "child" },
    ],
  },
  {
    employeeId: "EMP1651",
    lastName: "Thompson",
    firstName: "Dakota",
    email: "dakota.thompson@catchavibe.com",
    city: "Simi Valley",
    state: "CA",
    zip: "93065",
    county: "Ventura",
    dateOfBirth: "1976-04-22",
    eligibility: "20-29 Hours (Part-Time)",
    annualSalary: 35500,
    dependents: [],
  },
];

async function main() {
  console.log("🗑️  Clearing old census data...");

  // Clear in dependency order
  await db.execute(sql`TRUNCATE TABLE activity_log, notifications, enrollment_changes, enrollments, dependents, employees RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employers RESTART IDENTITY CASCADE`);

  console.log("✅ Old data cleared.");

  // Insert employer
  console.log("🏢 Inserting employer: Catch A Vibe...");
  const [employer] = await db
    .insert(employersTable)
    .values(EMPLOYER)
    .returning();
  console.log(`   Employer ID: ${employer.id}`);

  // Insert employees + dependents
  console.log(`👥 Inserting ${EMPLOYEES.length} employees...`);
  let empCount = 0;
  let depCount = 0;

  for (const empData of EMPLOYEES) {
    const { dependents, ...empFields } = empData;

    const [nameParts] = [empData.firstName.split(" ")];
    const lastName = empData.lastName;
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
      const [firstName, ...rest] = dep.name.split(" ");
      const depLastName = rest.join(" ") || lastName;

      await db.insert(dependentsTable).values({
        employeeId: employee.id,
        firstName,
        lastName: depLastName,
        relationship: dep.relationship,
        dateOfBirth: dep.dob,
        status: "active",
      });
      depCount++;
    }
  }

  // Seed activity log
  await db.insert(activityLogTable).values([
    {
      type: "census_upload",
      description: `Census imported for Catch A Vibe — ${EMPLOYEES.length} employees loaded`,
      relatedId: employer.id,
    },
  ]);

  console.log(`✅ Done! Inserted ${empCount} employees and ${depCount} dependents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
