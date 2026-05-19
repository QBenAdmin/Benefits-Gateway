import { Router } from "express";
import { SendChatbotMessageBody } from "@workspace/api-zod";

const router = Router();

const TOPICS = [
  {
    id: "hsa",
    title: "Health Savings Account (HSA)",
    description: "Tax-advantaged account for medical expenses paired with HDHPs",
    keywords: ["hsa", "health savings", "savings account", "hdhp", "high deductible"],
  },
  {
    id: "fsa",
    title: "Flexible Spending Account (FSA)",
    description: "Pre-tax account for eligible medical and dependent care expenses",
    keywords: ["fsa", "flexible spending", "use it or lose it", "flex spending"],
  },
  {
    id: "lsa",
    title: "Lifestyle Spending Account (LSA)",
    description: "Employer-funded account for wellness and lifestyle expenses",
    keywords: ["lsa", "lifestyle", "wellness", "gym", "fitness", "lifestyle spending"],
  },
  {
    id: "dependent_care_fsa",
    title: "Dependent Care FSA",
    description: "Pre-tax account for childcare, eldercare, and dependent care expenses",
    keywords: ["dependent care", "childcare", "daycare", "elder care", "dcfsa", "child care"],
  },
  {
    id: "ppo",
    title: "PPO Plans",
    description: "Preferred Provider Organization — flexible in-network and out-of-network coverage",
    keywords: ["ppo", "preferred provider", "out of network", "referral", "specialist"],
  },
  {
    id: "hmo",
    title: "HMO Plans",
    description: "Health Maintenance Organization — lower cost, requires in-network primary care",
    keywords: ["hmo", "health maintenance", "primary care", "pcp", "in network", "in-network"],
  },
  {
    id: "dental",
    title: "Dental Insurance",
    description: "Coverage for preventive, basic, and major dental services",
    keywords: ["dental", "teeth", "orthodontia", "braces", "cavity", "crown", "root canal"],
  },
  {
    id: "vision",
    title: "Vision Insurance",
    description: "Coverage for eye exams, glasses, and contact lenses",
    keywords: ["vision", "eye", "glasses", "contacts", "lenses", "optometrist", "eyewear"],
  },
  {
    id: "life",
    title: "Life Insurance",
    description: "Financial protection for beneficiaries in the event of death",
    keywords: ["life insurance", "term life", "beneficiary", "death benefit", "whole life"],
  },
  {
    id: "cobra",
    title: "COBRA Coverage",
    description: "Continuation of health coverage after leaving a job or losing eligibility",
    keywords: ["cobra", "continuation", "losing coverage", "job loss", "terminated", "unemployed"],
  },
  {
    id: "deductible",
    title: "Deductibles & Out-of-Pocket",
    description: "Understanding deductibles, copays, coinsurance, and out-of-pocket maximums",
    keywords: ["deductible", "out of pocket", "copay", "coinsurance", "premium", "cost sharing"],
  },
  {
    id: "open_enrollment",
    title: "Open Enrollment",
    description: "When and how to make benefits elections",
    keywords: ["open enrollment", "enroll", "election", "change benefits", "qualifying event", "life event"],
  },
];

interface KnowledgeEntry {
  topicId: string;
  keywords: string[];
  response: string;
  suggestions: string[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topicId: "hsa",
    keywords: ["hsa", "health savings account", "savings account", "hdhp"],
    response: `A Health Savings Account (HSA) is a tax-advantaged savings account you can use to pay for qualified medical expenses.

Key facts:
- You must be enrolled in a High Deductible Health Plan (HDHP) to contribute to an HSA
- Contributions are pre-tax (or tax-deductible if made post-tax)
- Money grows tax-free and withdrawals for qualified expenses are tax-free — a triple tax advantage
- 2025 contribution limits: $4,300 for individuals, $8,550 for families (plus $1,000 catch-up if 55+)
- Unused funds roll over year to year — there's no "use it or lose it" rule
- After age 65, you can withdraw for any reason without penalty (just pay income tax)
- Qualified expenses include doctor visits, prescriptions, dental, and vision care

HSAs are ideal if you're generally healthy and want to invest for future medical costs while saving on taxes.`,
    suggestions: [
      "How does an HSA compare to an FSA?",
      "What qualifies as an HDHP?",
      "What expenses can I pay with an HSA?",
    ],
  },
  {
    topicId: "fsa",
    keywords: ["fsa", "flexible spending", "flexible spending account", "use it or lose it"],
    response: `A Flexible Spending Account (FSA) is a pre-tax benefit account for eligible medical expenses.

Key facts:
- Contributions are deducted from your paycheck before taxes, reducing your taxable income
- 2025 contribution limit: $3,300 per year
- "Use it or lose it" rule: most funds must be spent within the plan year (some plans offer a $660 rollover or grace period)
- You can use FSA funds immediately — the full annual election is available on day one
- Eligible expenses: copays, deductibles, prescriptions, dental, vision, medical equipment
- You don't need an HDHP to have an FSA (unlike an HSA)
- FSAs are owned by your employer — you lose the account when you leave

An FSA is great if you have predictable medical expenses and want to lower your tax bill.`,
    suggestions: [
      "How does an FSA compare to an HSA?",
      "What is a Dependent Care FSA?",
      "What happens to my FSA when I leave my job?",
    ],
  },
  {
    topicId: "lsa",
    keywords: ["lsa", "lifestyle spending account", "lifestyle", "wellness", "gym", "fitness"],
    response: `A Lifestyle Spending Account (LSA) is an employer-funded benefit account for wellness and lifestyle expenses.

Key facts:
- Funded entirely by your employer — no employee contributions required
- Taxable benefit: reimbursements are included in your taxable income (unlike HSA/FSA)
- Eligible expenses are employer-defined and can include: gym memberships, fitness equipment, meditation apps, ergonomic home office equipment, financial wellness programs, tuition, and more
- Unused funds typically don't roll over (varies by plan)
- Very flexible — employers customize eligible expense categories

LSAs are an attractive perk that support overall employee wellbeing beyond just medical needs. Check your plan documents for the specific expenses your employer allows.`,
    suggestions: [
      "How is an LSA different from an FSA?",
      "What expenses are typically covered by an LSA?",
      "Is LSA reimbursement taxable?",
    ],
  },
  {
    topicId: "dependent_care_fsa",
    keywords: ["dependent care", "childcare", "daycare", "dcfsa", "dependent care fsa", "child care", "elder care"],
    response: `A Dependent Care FSA (DCFSA) lets you set aside pre-tax dollars to pay for eligible dependent care expenses.

Key facts:
- 2025 contribution limit: $5,000 per household ($2,500 if married filing separately)
- Eligible dependents: children under age 13, or a spouse/dependent who is physically or mentally unable to care for themselves
- Eligible expenses: daycare, after-school programs, summer day camp, babysitters, elder care
- Funds must be used by year-end (use-it-or-lose-it, with a grace period depending on your plan)
- Tax savings: if you're in the 22% bracket, $5,000 in DCFSA contributions saves you $1,100 in federal taxes
- Cannot be used for overnight camp, tutoring, or school tuition (K-12)
- Compare with the Child and Dependent Care Tax Credit to see which saves you more

A DCFSA is most valuable for working parents with regular childcare or eldercare costs.`,
    suggestions: [
      "Can I use DCFSA for summer camp?",
      "How does DCFSA interact with the Child Tax Credit?",
      "What happens to DCFSA funds if I don't use them?",
    ],
  },
  {
    topicId: "ppo",
    keywords: ["ppo", "preferred provider", "out of network", "specialist", "no referral"],
    response: `A PPO (Preferred Provider Organization) is a flexible health insurance plan with a broad provider network.

Key facts:
- See any doctor, in-network or out-of-network, without a referral
- In-network care costs less; out-of-network care is covered at a lower rate
- Higher premiums than HMOs, but greater flexibility
- You don't need a primary care physician (PCP)
- Best for: people with ongoing specialists, frequent travelers, or those who value flexibility
- Typically has a deductible you meet before insurance pays its share
- After the deductible, you pay coinsurance (e.g., 20%) until you hit your out-of-pocket maximum

PPOs are ideal if you want maximum flexibility in choosing your healthcare providers.`,
    suggestions: [
      "How does a PPO compare to an HMO?",
      "When should I choose a PPO over an HMO?",
      "What is a deductible?",
    ],
  },
  {
    topicId: "hmo",
    keywords: ["hmo", "health maintenance organization", "primary care", "pcp", "in-network", "in network", "referral"],
    response: `An HMO (Health Maintenance Organization) is a structured health plan with lower costs and a defined network.

Key facts:
- You must choose a primary care physician (PCP) who coordinates your care
- Referrals from your PCP are typically required to see specialists
- Coverage is generally limited to in-network providers (except emergencies)
- Lower premiums and out-of-pocket costs compared to PPOs
- Predictable copays for office visits and services
- Best for: people who want lower costs and don't mind staying in-network
- If you use an out-of-network provider without authorization, you may pay 100% of the cost

HMOs are great for cost-conscious employees who have providers within the network.`,
    suggestions: [
      "How does an HMO compare to a PPO?",
      "What happens if I see an out-of-network doctor on an HMO?",
      "Should I choose an HMO or PPO?",
    ],
  },
  {
    topicId: "hmo_vs_ppo",
    keywords: ["hmo vs ppo", "hmo or ppo", "compare plans", "which plan", "difference between hmo and ppo"],
    response: `Choosing between an HMO and PPO depends on your health needs and priorities:

Choose an HMO if you:
- Want lower monthly premiums and predictable copays
- Are comfortable with a primary care physician coordinating your care
- Rarely need specialists or out-of-network care
- Live and work in the plan's service area

Choose a PPO if you:
- Value the freedom to see any doctor without referrals
- Have existing relationships with specialists you want to keep
- Travel frequently or may need out-of-area care
- Are willing to pay higher premiums for flexibility

Cost comparison example:
- HMO: $195/mo premium, $30 copay per visit, no deductible for in-network
- PPO: $285/mo premium, $1,500 deductible, then 20% coinsurance

If you're generally healthy with few medical needs, an HMO's lower cost may be ideal. If you have ongoing health conditions or need specialist access, a PPO provides more flexibility.`,
    suggestions: [
      "What is an HSA-eligible HDHP?",
      "How do deductibles work?",
      "Can I switch plans mid-year?",
    ],
  },
  {
    topicId: "deductible",
    keywords: ["deductible", "out of pocket", "copay", "coinsurance", "premium", "cost", "cost sharing", "maximum"],
    response: `Understanding health plan cost terms:

Premium: The monthly amount you pay for coverage, regardless of whether you use healthcare.

Deductible: The amount you pay out-of-pocket before your insurance starts paying. Example: with a $1,500 deductible, you pay the first $1,500 of covered services each year.

Copay: A fixed amount you pay for a specific service (e.g., $30 for a primary care visit), often applies even before you meet your deductible.

Coinsurance: After meeting your deductible, you share costs with your insurer. Example: 20% coinsurance means you pay 20%, insurer pays 80%.

Out-of-Pocket Maximum: The most you'll pay in a year. After reaching this limit, insurance covers 100% of covered services for the rest of the year. 2025 federal limit: $9,450 individual / $18,900 family.

Lower premium plans typically have higher deductibles — you're betting on staying healthy. Higher premium plans have lower deductibles — better if you use healthcare regularly.`,
    suggestions: [
      "What is the difference between an HMO and PPO?",
      "Should I choose a plan with a high deductible and contribute to an HSA?",
      "What counts toward my deductible?",
    ],
  },
  {
    topicId: "cobra",
    keywords: ["cobra", "continuation", "losing coverage", "job loss", "terminated", "leaving job", "unemployed", "laid off"],
    response: `COBRA (Consolidated Omnibus Budget Reconciliation Act) lets you continue your employer-sponsored health coverage after certain qualifying events.

Qualifying events that trigger COBRA eligibility:
- Voluntary or involuntary job loss (unless for gross misconduct)
- Reduction in hours that causes loss of coverage
- Divorce or legal separation from the covered employee
- Dependent child aging out of coverage at 26
- Employee's death

Key facts:
- You have 60 days from losing coverage to elect COBRA
- Coverage can last 18 months (36 months in some cases)
- You pay the full premium (what you + your employer paid) plus a 2% admin fee
- COBRA is often expensive — compare with marketplace plans at healthcare.gov
- Coverage is retroactive: you can elect COBRA after incurring a medical expense within the 60-day window

Dependents turning 26 receive a COBRA notice automatically. They have 60 days to elect continuation coverage.`,
    suggestions: [
      "How long does COBRA last?",
      "When does a dependent age off my plan?",
      "What are alternatives to COBRA?",
    ],
  },
  {
    topicId: "dental",
    keywords: ["dental", "teeth", "orthodontia", "braces", "dentist", "cavity", "crown", "root canal", "cleaning"],
    response: `Dental insurance covers a range of dental services, typically organized into three categories:

Preventive care (usually 100% covered):
- Routine cleanings (typically 2 per year)
- Exams and X-rays

Basic services (usually 70-80% covered after deductible):
- Fillings, extractions, root canals, periodontal treatment

Major services (usually 50% covered after deductible):
- Crowns, bridges, dentures, implants (implants may be excluded)

Orthodontia:
- Braces for children often covered (50%) up to a lifetime maximum (e.g., $1,500)
- Adult orthodontia coverage varies by plan

Key terms:
- Annual maximum: most dental plans cap benefits at $1,000-$2,000/year
- Waiting periods: major services often have a 6-12 month waiting period on new plans
- In-network dentists provide the highest level of coverage

Review your plan's Summary of Benefits to understand your specific coverage limits.`,
    suggestions: [
      "Does dental insurance cover implants?",
      "Is orthodontia covered for adults?",
      "How often can I get a cleaning covered?",
    ],
  },
  {
    topicId: "vision",
    keywords: ["vision", "eye", "glasses", "contacts", "lenses", "optometrist", "eyewear", "lasik"],
    response: `Vision insurance helps cover the cost of routine eye care and corrective lenses.

Typical vision plan benefits:
- Eye exam: covered once per year (or once every 24 months depending on plan)
- Frames allowance: $130-$200 toward frames (once per year or every 2 years)
- Lenses: covered once per year (single vision, bifocal, progressive)
- Contact lenses: typically a $130-$200 allowance in lieu of glasses
- Discounts on LASIK surgery (usually 15-20% off)

Key facts:
- Vision plans are generally very affordable ($10-$15/mo for employee-only)
- Benefits reset annually or every 2 years depending on your plan
- In-network providers (e.g., VSP, EyeMed network doctors) provide the most value
- Most plans don't cover medical eye conditions — those go through medical insurance

Even if you don't wear glasses, an annual eye exam can detect conditions like glaucoma, diabetes, and high blood pressure.`,
    suggestions: [
      "Does vision insurance cover LASIK?",
      "Can I use vision benefits for contacts instead of glasses?",
      "How often does vision insurance cover an eye exam?",
    ],
  },
  {
    topicId: "open_enrollment",
    keywords: ["open enrollment", "enroll", "change benefits", "election", "qualifying event", "life event", "when can i"],
    response: `Open enrollment is the annual period when you can change your benefits elections.

During open enrollment you can:
- Switch health plans (HMO to PPO or vice versa)
- Add or drop dependents
- Enroll in or change dental, vision, life, and disability coverage
- Elect or change HSA/FSA/DCFSA contribution amounts

Outside of open enrollment, you can only make changes if you have a Qualifying Life Event (QLE):
- Marriage or divorce
- Birth or adoption of a child
- Loss of other coverage (e.g., spouse loses their job)
- Change in employment status
- Dependent turning 26 and aging off the plan
- Move to a new coverage area (for HMO plans)

Important: You typically have 30-60 days from the qualifying event to request a benefits change. Changes outside this window require administrator approval and documentation.

If you miss open enrollment and have no QLE, your current elections will continue unchanged for the next plan year.`,
    suggestions: [
      "What counts as a qualifying life event?",
      "Can I add a dependent outside of open enrollment?",
      "What happens if I miss open enrollment?",
    ],
  },
];

function findBestMatch(message: string): KnowledgeEntry | null {
  const lower = message.toLowerCase();

  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        score += kw.split(" ").length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

const DEFAULT_RESPONSE = `I'm here to help you understand your benefits options. I can answer questions about:

- Health plans: HMO vs PPO differences, how to choose the right plan
- HSA (Health Savings Account): contributions, eligible expenses, tax advantages
- FSA (Flexible Spending Account): limits, use-it-or-lose-it rules
- Dependent Care FSA: childcare expenses, annual limits
- LSA (Lifestyle Spending Account): wellness and lifestyle expenses
- Dental and vision insurance coverage
- Life insurance and COBRA continuation coverage
- Open enrollment and qualifying life events
- Understanding deductibles, copays, and out-of-pocket costs

Try asking something like: "How does an HSA work?" or "What's the difference between an HMO and PPO?"`;

router.get("/chatbot/topics", (req, res) => {
  res.json(TOPICS);
});

router.post("/chatbot/message", (req, res) => {
  const parsed = SendChatbotMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { message, sessionId } = parsed.data;
  const match = findBestMatch(message);

  const responseSessionId = sessionId ?? `session-${Date.now()}`;

  if (match) {
    res.json({
      response: match.response,
      topicId: match.topicId,
      suggestions: match.suggestions,
      sessionId: responseSessionId,
    });
  } else {
    res.json({
      response: DEFAULT_RESPONSE,
      topicId: null,
      suggestions: [
        "How does an HSA work?",
        "What's the difference between an HMO and PPO?",
        "What is a Dependent Care FSA?",
        "How does open enrollment work?",
      ],
      sessionId: responseSessionId,
    });
  }
});

export default router;
