import { db } from "@workspace/db";
import {
  employersTable,
  employeesTable,
  dependentsTable,
  benefitPlansTable,
  integrationsTable,
  activityLogTable,
  carriersTable,
} from "@workspace/db";
import { sql, count } from "drizzle-orm";
import { logger } from "./logger";

// ── helpers ───────────────────────────────────────────────────────────────────
function toStatus(elig: string): "active" | "inactive" {
  return elig.startsWith("<20") ? "inactive" : "active";
}
function toJobTitle(elig: string): string {
  if (elig.startsWith("30+")) return "Full-Time Employee";
  if (elig.startsWith("20-29")) return "Part-Time Employee";
  return "Ineligible";
}
function parseDob(raw: string): string {
  const [m, d, y] = raw.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function toRel(r: string): string {
  const s = r.toLowerCase().trim();
  if (s === "spouse") return "spouse";
  if (s === "child") return "child";
  if (s.includes("domestic")) return "domestic_partner";
  return s;
}

// ── census data ───────────────────────────────────────────────────────────────
type EmpRow = {
  employeeId: string; lastName: string; firstName: string; email: string;
  city: string; state: string; zip: string; dateOfBirth: string;
  eligibility: string; annualSalary: number;
  dependents: { name: string; dob: string; relationship: string }[];
};

const CAV_EMPLOYEES: EmpRow[] = [
  { employeeId:"EMP2824",lastName:"Martinez",firstName:"Jordan",email:"jordan.martinez@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1974-03-24",eligibility:"30+ Hours (Full-Time)",annualSalary:56000,dependents:[{name:"Noah Martinez",dob:"1979-09-20",relationship:"spouse"},{name:"Emma Martinez",dob:"2022-04-23",relationship:"child"}] },
  { employeeId:"EMP9928",lastName:"Davis",firstName:"Dakota",email:"dakota.davis@catchavibe.com",city:"Newbury Park",state:"CA",zip:"91320",dateOfBirth:"1997-05-26",eligibility:"<20 Hours (Ineligible)",annualSalary:34000,dependents:[{name:"Ethan Davis",dob:"2013-03-07",relationship:"child"},{name:"Cameron Davis",dob:"2008-02-13",relationship:"child"}] },
  { employeeId:"EMP2584",lastName:"Thomas",firstName:"Reese",email:"reese.thomas@catchavibe.com",city:"Santa Barbara",state:"CA",zip:"93101",dateOfBirth:"1962-12-15",eligibility:"30+ Hours (Full-Time)",annualSalary:93000,dependents:[] },
  { employeeId:"EMP5803",lastName:"Thomas",firstName:"Sidney",email:"sidney.thomas@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1964-01-22",eligibility:"30+ Hours (Full-Time)",annualSalary:82000,dependents:[{name:"Liam Thomas",dob:"2017-05-15",relationship:"child"},{name:"Ethan Thomas",dob:"2010-06-12",relationship:"child"},{name:"Noah Thomas",dob:"2013-12-22",relationship:"child"}] },
  { employeeId:"EMP2169",lastName:"Garcia",firstName:"Sidney",email:"sidney.garcia@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1970-08-13",eligibility:"30+ Hours (Full-Time)",annualSalary:73000,dependents:[{name:"Emma Garcia",dob:"2012-01-26",relationship:"child"},{name:"Ethan Garcia",dob:"2017-05-03",relationship:"child"}] },
  { employeeId:"EMP4456",lastName:"Anderson",firstName:"Robin",email:"robin.anderson@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1991-07-21",eligibility:"30+ Hours (Full-Time)",annualSalary:78000,dependents:[] },
  { employeeId:"EMP9830",lastName:"Thompson",firstName:"Quinn",email:"quinn.thompson@catchavibe.com",city:"Moorpark",state:"CA",zip:"93021",dateOfBirth:"1997-07-12",eligibility:"30+ Hours (Full-Time)",annualSalary:62000,dependents:[{name:"Liam Thompson",dob:"1974-11-06",relationship:"spouse"}] },
  { employeeId:"EMP7916",lastName:"Williams",firstName:"Sidney",email:"sidney.williams@catchavibe.com",city:"Moorpark",state:"CA",zip:"93021",dateOfBirth:"1984-10-15",eligibility:"30+ Hours (Full-Time)",annualSalary:46000,dependents:[{name:"Ethan Williams",dob:"1972-05-14",relationship:"domestic_partner"},{name:"Olivia Williams",dob:"2019-01-24",relationship:"child"}] },
  { employeeId:"EMP5315",lastName:"Garcia",firstName:"Logan",email:"logan.garcia@catchavibe.com",city:"Camarillo",state:"CA",zip:"93010",dateOfBirth:"1979-11-17",eligibility:"20-29 Hours (Part-Time)",annualSalary:32500,dependents:[{name:"William Garcia",dob:"1985-08-01",relationship:"spouse"}] },
  { employeeId:"EMP2832",lastName:"Wilson",firstName:"Reese",email:"reese.wilson@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1963-04-19",eligibility:"<20 Hours (Ineligible)",annualSalary:23000,dependents:[{name:"Isabella Wilson",dob:"2009-03-22",relationship:"child"},{name:"Mason Wilson",dob:"2022-03-09",relationship:"child"}] },
  { employeeId:"EMP9645",lastName:"Moore",firstName:"Sidney",email:"sidney.moore@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1994-12-23",eligibility:"30+ Hours (Full-Time)",annualSalary:84000,dependents:[{name:"Ethan Moore",dob:"2019-09-15",relationship:"child"}] },
  { employeeId:"EMP2982",lastName:"Davis",firstName:"Avery",email:"avery.davis@catchavibe.com",city:"Camarillo",state:"CA",zip:"93010",dateOfBirth:"1981-01-19",eligibility:"30+ Hours (Full-Time)",annualSalary:73000,dependents:[] },
  { employeeId:"EMP1964",lastName:"Williams",firstName:"Avery",email:"avery.williams@catchavibe.com",city:"Oxnard",state:"CA",zip:"93030",dateOfBirth:"1981-02-17",eligibility:"30+ Hours (Full-Time)",annualSalary:107000,dependents:[] },
  { employeeId:"EMP3167",lastName:"Thompson",firstName:"Robin",email:"robin.thompson@catchavibe.com",city:"Newbury Park",state:"CA",zip:"91320",dateOfBirth:"1975-08-26",eligibility:"30+ Hours (Full-Time)",annualSalary:57000,dependents:[] },
  { employeeId:"EMP8062",lastName:"Moore",firstName:"Reese",email:"reese.moore@catchavibe.com",city:"Moorpark",state:"CA",zip:"93021",dateOfBirth:"1989-12-02",eligibility:"20-29 Hours (Part-Time)",annualSalary:48500,dependents:[] },
  { employeeId:"EMP7596",lastName:"Brown",firstName:"Skyler",email:"skyler.brown@catchavibe.com",city:"Ventura",state:"CA",zip:"93001",dateOfBirth:"1972-04-18",eligibility:"30+ Hours (Full-Time)",annualSalary:99000,dependents:[] },
  { employeeId:"EMP8579",lastName:"Perez",firstName:"Finley",email:"finley.perez@catchavibe.com",city:"Camarillo",state:"CA",zip:"93010",dateOfBirth:"1963-11-18",eligibility:"20-29 Hours (Part-Time)",annualSalary:30500,dependents:[{name:"Olivia Perez",dob:"2018-08-16",relationship:"child"},{name:"Noah Perez",dob:"2017-01-06",relationship:"child"},{name:"Sophia Perez",dob:"2005-07-09",relationship:"child"}] },
  { employeeId:"EMP8454",lastName:"Moore",firstName:"Drew",email:"drew.moore@catchavibe.com",city:"Newbury Park",state:"CA",zip:"91320",dateOfBirth:"1969-04-10",eligibility:"30+ Hours (Full-Time)",annualSalary:52000,dependents:[{name:"Ethan Moore",dob:"2006-01-19",relationship:"child"},{name:"Mason Moore",dob:"2021-09-06",relationship:"child"}] },
  { employeeId:"EMP1931",lastName:"Williams",firstName:"Logan",email:"logan.williams@catchavibe.com",city:"Thousand Oaks",state:"CA",zip:"91360",dateOfBirth:"1964-10-03",eligibility:"20-29 Hours (Part-Time)",annualSalary:35500,dependents:[{name:"William Williams",dob:"2012-10-20",relationship:"child"}] },
  { employeeId:"EMP1651",lastName:"Thompson",firstName:"Dakota",email:"dakota.thompson@catchavibe.com",city:"Simi Valley",state:"CA",zip:"93065",dateOfBirth:"1976-04-22",eligibility:"20-29 Hours (Part-Time)",annualSalary:35500,dependents:[] },
];

const BTC_EMPLOYEES: EmpRow[] = [
  { employeeId:"EMP8309",lastName:"Okafor",firstName:"Wren",email:"wren.okafor@betacorp.com",city:"Burbank",state:"CA",zip:"91501",dateOfBirth:parseDob("04/05/1976"),eligibility:"20-29 Hours (Part-Time)",annualSalary:34000,dependents:[{name:"Isla Okafor",dob:parseDob("10/16/2007"),relationship:"child"},{name:"Miles Okafor",dob:parseDob("12/20/2018"),relationship:"child"}] },
  { employeeId:"EMP9820",lastName:"Petrov",firstName:"Sloane",email:"sloane.petrov@betacorp.com",city:"El Segundo",state:"CA",zip:"90245",dateOfBirth:parseDob("03/15/1975"),eligibility:"20-29 Hours (Part-Time)",annualSalary:44000,dependents:[] },
  { employeeId:"EMP9331",lastName:"Delgado",firstName:"Emery",email:"emery.delgado@betacorp.com",city:"Torrance",state:"CA",zip:"90501",dateOfBirth:parseDob("01/09/1987"),eligibility:"20-29 Hours (Part-Time)",annualSalary:39500,dependents:[] },
  { employeeId:"EMP9377",lastName:"Yamamoto",firstName:"Emery",email:"emery.yamamoto@betacorp.com",city:"Glendale",state:"CA",zip:"91201",dateOfBirth:parseDob("08/02/2000"),eligibility:"30+ Hours (Full-Time)",annualSalary:75000,dependents:[{name:"Luna Yamamoto",dob:parseDob("10/06/2019"),relationship:"child"},{name:"Isla Yamamoto",dob:parseDob("01/04/2010"),relationship:"child"},{name:"Aria Yamamoto",dob:parseDob("08/22/2010"),relationship:"child"}] },
  { employeeId:"EMP8432",lastName:"Osei",firstName:"Emery",email:"emery.osei@betacorp.com",city:"Pasadena",state:"CA",zip:"91101",dateOfBirth:parseDob("05/20/1971"),eligibility:"30+ Hours (Full-Time)",annualSalary:90000,dependents:[] },
  { employeeId:"EMP8320",lastName:"Kim",firstName:"Sloane",email:"sloane.kim@betacorp.com",city:"Glendale",state:"CA",zip:"91201",dateOfBirth:parseDob("05/18/1990"),eligibility:"30+ Hours (Full-Time)",annualSalary:64000,dependents:[{name:"Kai Kim",dob:parseDob("03/24/2006"),relationship:"child"}] },
  { employeeId:"EMP9912",lastName:"Haddad",firstName:"Kendall",email:"kendall.haddad@betacorp.com",city:"El Segundo",state:"CA",zip:"90245",dateOfBirth:parseDob("02/04/1969"),eligibility:"30+ Hours (Full-Time)",annualSalary:70000,dependents:[{name:"Luna Haddad",dob:parseDob("09/11/1978"),relationship:"domestic_partner"},{name:"Kai Haddad",dob:parseDob("05/04/2012"),relationship:"child"},{name:"Leo Haddad",dob:parseDob("11/03/2010"),relationship:"child"}] },
  { employeeId:"EMP9106",lastName:"Nguyen",firstName:"Tatum",email:"tatum.nguyen@betacorp.com",city:"Santa Monica",state:"CA",zip:"90401",dateOfBirth:parseDob("04/13/1983"),eligibility:"30+ Hours (Full-Time)",annualSalary:99000,dependents:[{name:"Isla Nguyen",dob:parseDob("03/02/1970"),relationship:"domestic_partner"}] },
  { employeeId:"EMP8055",lastName:"Yamamoto",firstName:"Wren",email:"wren.yamamoto@betacorp.com",city:"Glendale",state:"CA",zip:"91201",dateOfBirth:parseDob("11/08/1981"),eligibility:"20-29 Hours (Part-Time)",annualSalary:35500,dependents:[] },
  { employeeId:"EMP7571",lastName:"Kowalski",firstName:"Sloane",email:"sloane.kowalski@betacorp.com",city:"El Segundo",state:"CA",zip:"90245",dateOfBirth:parseDob("08/25/1980"),eligibility:"<20 Hours (Ineligible)",annualSalary:34000,dependents:[{name:"Finn Kowalski",dob:parseDob("05/22/1997"),relationship:"domestic_partner"}] },
  { employeeId:"EMP7626",lastName:"Mbeki",firstName:"Brecken",email:"brecken.mbeki@betacorp.com",city:"Burbank",state:"CA",zip:"91501",dateOfBirth:parseDob("07/10/1978"),eligibility:"30+ Hours (Full-Time)",annualSalary:68000,dependents:[] },
  { employeeId:"EMP9950",lastName:"Yamamoto",firstName:"Vesper",email:"vesper.yamamoto@betacorp.com",city:"Glendale",state:"CA",zip:"91201",dateOfBirth:parseDob("06/07/1986"),eligibility:"30+ Hours (Full-Time)",annualSalary:93000,dependents:[{name:"Luna Yamamoto",dob:parseDob("11/14/1981"),relationship:"spouse"},{name:"Miles Yamamoto",dob:parseDob("06/22/2018"),relationship:"child"}] },
  { employeeId:"EMP8275",lastName:"Rivera",firstName:"Blake",email:"blake.rivera@betacorp.com",city:"Glendale",state:"CA",zip:"91201",dateOfBirth:parseDob("09/10/1962"),eligibility:"<20 Hours (Ineligible)",annualSalary:31500,dependents:[{name:"Kai Rivera",dob:parseDob("05/24/2011"),relationship:"child"},{name:"Nora Rivera",dob:parseDob("09/17/2019"),relationship:"child"},{name:"River Rivera",dob:parseDob("04/24/2014"),relationship:"child"}] },
  { employeeId:"EMP5168",lastName:"Ferreira",firstName:"Rowan",email:"rowan.ferreira@betacorp.com",city:"Pasadena",state:"CA",zip:"91101",dateOfBirth:parseDob("01/02/1999"),eligibility:"30+ Hours (Full-Time)",annualSalary:95000,dependents:[{name:"River Ferreira",dob:parseDob("05/07/2023"),relationship:"child"},{name:"Finn Ferreira",dob:parseDob("07/26/2017"),relationship:"child"},{name:"Luna Ferreira",dob:parseDob("08/11/2013"),relationship:"child"}] },
  { employeeId:"EMP6052",lastName:"Yamamoto",firstName:"Kendall",email:"kendall.yamamoto@betacorp.com",city:"El Segundo",state:"CA",zip:"90245",dateOfBirth:parseDob("09/23/1988"),eligibility:"30+ Hours (Full-Time)",annualSalary:80000,dependents:[] },
  { employeeId:"EMP8794",lastName:"Hassan",firstName:"Indigo",email:"indigo.hassan@betacorp.com",city:"Burbank",state:"CA",zip:"91501",dateOfBirth:parseDob("10/21/1992"),eligibility:"<20 Hours (Ineligible)",annualSalary:27500,dependents:[{name:"Isla Hassan",dob:parseDob("08/17/1980"),relationship:"spouse"},{name:"Aria Hassan",dob:parseDob("06/26/2008"),relationship:"child"}] },
  { employeeId:"EMP9047",lastName:"Dubois",firstName:"Emery",email:"emery.dubois@betacorp.com",city:"Santa Monica",state:"CA",zip:"90401",dateOfBirth:parseDob("11/18/1998"),eligibility:"30+ Hours (Full-Time)",annualSalary:49000,dependents:[{name:"Zoe Dubois",dob:parseDob("03/19/1975"),relationship:"domestic_partner"},{name:"Aria Dubois",dob:parseDob("01/02/2017"),relationship:"child"}] },
  { employeeId:"EMP7804",lastName:"Kowalski",firstName:"Shea",email:"shea.kowalski@betacorp.com",city:"Long Beach",state:"CA",zip:"90801",dateOfBirth:parseDob("08/02/1972"),eligibility:"20-29 Hours (Part-Time)",annualSalary:39000,dependents:[] },
  { employeeId:"EMP6544",lastName:"Delgado",firstName:"Rowan",email:"rowan.delgado@betacorp.com",city:"Burbank",state:"CA",zip:"91501",dateOfBirth:parseDob("05/22/1979"),eligibility:"30+ Hours (Full-Time)",annualSalary:119000,dependents:[{name:"Luna Delgado",dob:parseDob("11/27/2016"),relationship:"child"},{name:"Isla Delgado",dob:parseDob("12/22/2007"),relationship:"child"},{name:"Finn Delgado",dob:parseDob("03/05/2009"),relationship:"child"}] },
  { employeeId:"EMP9467",lastName:"Kim",firstName:"Emery",email:"emery.kim@betacorp.com",city:"El Segundo",state:"CA",zip:"90245",dateOfBirth:parseDob("06/28/1972"),eligibility:"20-29 Hours (Part-Time)",annualSalary:33000,dependents:[{name:"Luna Kim",dob:parseDob("01/11/2015"),relationship:"child"},{name:"Nora Kim",dob:parseDob("05/06/2011"),relationship:"child"}] },
];

// ── main exported function ────────────────────────────────────────────────────

export type SeedResult =
  | { seeded: false; reason: string }
  | { seeded: true; employers: string[]; employees: number; dependents: number; benefitPlans: number; integrations: number };

export async function seedDatabase(): Promise<SeedResult> {
  const [{ n }] = await db.select({ n: count() }).from(employersTable);
  if (n > 0) {
    return { seeded: false, reason: `Already seeded (${n} employer(s) present)` };
  }

  logger.info("Database is empty — running startup seed...");

  // Clear any stale partial data from previous schema migrations
  await db.execute(sql`
    TRUNCATE TABLE activity_log, notifications, enrollment_changes, enrollments,
                  dependents, employees, benefit_plans RESTART IDENTITY CASCADE
  `);
  await db.execute(sql`TRUNCATE TABLE employers RESTART IDENTITY CASCADE`);
  await db.execute(sql`DELETE FROM integrations WHERE type = 'retirement'`);

  // Resolve carrier IDs dynamically
  const carriers = await db.select().from(carriersTable).orderBy(carriersTable.id);
  const C_BLUE  = carriers.find(c => c.name.includes("Blue Shield"))?.id ?? 1;
  const C_DELTA = carriers.find(c => c.name.includes("Delta Dental"))?.id ?? 2;
  const C_VSP   = carriers.find(c => c.name.includes("VSP"))?.id ?? 3;
  const C_META  = carriers.find(c => c.name.includes("MetLife"))?.id ?? 4;

  // Insert employers
  const [cavEmp] = await db.insert(employersTable).values({
    name: "Catch A Vibe", ein: "95-6700000",
    industry: "Computer Programming Services",
    city: "Folsom", state: "CA", zip: "95670",
    contactName: "HR Administrator", contactEmail: "hr@catchavibe.com",
    contactPhone: "805-555-0100",
  }).returning();

  const [btcEmp] = await db.insert(employersTable).values({
    name: "BetaCorp", ein: "68-0000831",
    industry: "Commercial Physical & Biological Research",
    city: "Sacramento", state: "CA", zip: "95833",
    contactName: "HR Administrator", contactEmail: "hr@betacorp.com",
  }).returning();

  // Insert employees + dependents
  async function insertCensus(rows: EmpRow[], employerId: number) {
    let empCount = 0; let depCount = 0;
    for (const row of rows) {
      const { dependents, ...f } = row;
      const [emp] = await db.insert(employeesTable).values({
        employerId,
        employeeId: f.employeeId,
        firstName: f.firstName, lastName: f.lastName,
        email: f.email,
        city: f.city, state: f.state, zip: f.zip,
        dateOfBirth: f.dateOfBirth,
        annualSalary: f.annualSalary.toFixed(2),
        status: toStatus(f.eligibility),
        jobTitle: toJobTitle(f.eligibility),
        department: "General",
        invitationStatus: "not_invited",
      }).returning();
      empCount++;
      for (const dep of dependents) {
        const parts = dep.name.split(" ");
        await db.insert(dependentsTable).values({
          employeeId: emp.id,
          firstName: parts[0],
          lastName: parts.slice(1).join(" ") || f.lastName,
          relationship: toRel(dep.relationship),
          dateOfBirth: dep.dob,
          status: "active",
        });
        depCount++;
      }
    }
    return { empCount, depCount };
  }

  const cavResult = await insertCensus(CAV_EMPLOYEES, cavEmp.id);
  const btcResult = await insertCensus(BTC_EMPLOYEES, btcEmp.id);
  const totalEmp = cavResult.empCount + btcResult.empCount;
  const totalDep = cavResult.depCount + btcResult.depCount;

  // Insert benefit plans
  await db.insert(benefitPlansTable).values([
    { employerId:cavEmp.id, name:"Blue Shield PPO Gold",         type:"medical",    carrierId:C_BLUE,  groupNumber:"CAV-MED-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"185.00", employerCost:"620.00", deductible:"500.00",  outOfPocketMax:"3500.00", description:"PPO plan with broad network. In-network deductible $500.",  isActive:true },
    { employerId:cavEmp.id, name:"Blue Shield HMO Silver",       type:"medical",    carrierId:C_BLUE,  groupNumber:"CAV-MED-002", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"95.00",  employerCost:"480.00", deductible:"1500.00", outOfPocketMax:"6000.00", description:"HMO plan requiring PCP referrals. $1,500 deductible.",    isActive:true },
    { employerId:cavEmp.id, name:"Delta Dental PPO",             type:"dental",     carrierId:C_DELTA, groupNumber:"CAV-DEN-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"18.00",  employerCost:"42.00",  deductible:"50.00",   outOfPocketMax:"1500.00", description:"Preventive 100%, Basic 80%, Major 50%. Annual max $1,500.", isActive:true },
    { employerId:cavEmp.id, name:"VSP Vision Basic",             type:"vision",     carrierId:C_VSP,   groupNumber:"CAV-VIS-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"6.50",   employerCost:"8.50",   deductible:"0.00",    outOfPocketMax:"200.00",  description:"Annual exam, $150 frame allowance, contact lens coverage.",  isActive:true },
    { employerId:cavEmp.id, name:"MetLife Group Term Life",      type:"life",       carrierId:C_META,  groupNumber:"CAV-LIFE-001",planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"0.00",   employerCost:"12.00",                                                description:"Employer-paid: 1× annual salary up to $250,000.",           isActive:true },
    { employerId:cavEmp.id, name:"MetLife Short-Term Disability",type:"disability", carrierId:C_META,  groupNumber:"CAV-STD-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"8.00",   employerCost:"22.00",                                                description:"60% of weekly salary, 7-day EP, up to 26 weeks.",           isActive:true },
    { employerId:btcEmp.id, name:"Blue Shield PPO Platinum",     type:"medical",    carrierId:C_BLUE,  groupNumber:"BTC-MED-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"210.00", employerCost:"790.00", deductible:"250.00",  outOfPocketMax:"2000.00", description:"Premium PPO. Covers 90% after $250 deductible.",           isActive:true },
    { employerId:btcEmp.id, name:"Blue Shield HDHP + HSA",      type:"medical",    carrierId:C_BLUE,  groupNumber:"BTC-MED-002", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"65.00",  employerCost:"420.00", deductible:"2800.00", outOfPocketMax:"7000.00", description:"HDHP + HSA. BetaCorp contributes $500/yr to your HSA.",   isActive:true },
    { employerId:btcEmp.id, name:"Delta Dental Enhanced",        type:"dental",     carrierId:C_DELTA, groupNumber:"BTC-DEN-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"22.00",  employerCost:"58.00",  deductible:"50.00",   outOfPocketMax:"2000.00", description:"Includes ortho (50%, $1,500 lifetime). Annual max $2,000.", isActive:true },
    { employerId:btcEmp.id, name:"VSP Vision Enhanced",         type:"vision",     carrierId:C_VSP,   groupNumber:"BTC-VIS-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"8.00",   employerCost:"12.00",  deductible:"0.00",    outOfPocketMax:"300.00",  description:"Annual exam, $200 frame allowance, 2-year contact lens.",   isActive:true },
    { employerId:btcEmp.id, name:"MetLife Group Term Life",      type:"life",       carrierId:C_META,  groupNumber:"BTC-LIFE-001",planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"0.00",   employerCost:"18.00",                                                description:"Employer-paid: 2× annual salary up to $500,000.",           isActive:true },
    { employerId:btcEmp.id, name:"MetLife Long-Term Disability", type:"disability", carrierId:C_META,  groupNumber:"BTC-LTD-001", planYear:"2025", effectiveDate:"2025-01-01", renewalDate:"2025-12-31", employeeCost:"14.00",  employerCost:"36.00",                                                description:"60% of monthly salary, 90-day EP, benefits to age 65.",    isActive:true },
  ]);

  // Insert Human Interest integration
  await db.insert(integrationsTable).values({
    name: "Human Interest",
    provider: "human-interest",
    type: "retirement",
    status: "connected",
    syncedEmployees: totalEmp,
    apiEndpoint: "https://api.humaninterest.com/v1",
    notes: "401(k) retirement plan administration. Syncs employee eligibility and deferral elections bi-directionally.",
  });

  // Activity log entries
  await db.insert(activityLogTable).values([
    { type:"census_upload", description:`Census imported for Catch A Vibe — ${cavResult.empCount} employees loaded`, relatedId:cavEmp.id },
    { type:"census_upload", description:`Census imported for BetaCorp — ${btcResult.empCount} employees loaded`,    relatedId:btcEmp.id },
  ]);

  logger.info({ employers:2, employees:totalEmp, dependents:totalDep, benefitPlans:12, integrations:4 }, "Startup seed complete");

  return {
    seeded: true,
    employers: [cavEmp.name, btcEmp.name],
    employees: totalEmp,
    dependents: totalDep,
    benefitPlans: 12,
    integrations: 4,
  };
}
