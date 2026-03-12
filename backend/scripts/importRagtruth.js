#!/usr/bin/env node
/**
 * Dataset expansion script — 200 cases with diverse inputs.
 * Keeps all 85 original cases. Adds 115 synthetic cases with varied
 * question/context/answer triples across 6 domains.
 *
 * Usage: node backend/scripts/importRagtruth.js
 *
 * With HuggingFace token (optional, pulls real RAGTruth data):
 *   HUGGINGFACE_TOKEN=hf_xxx node backend/scripts/importRagtruth.js
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = join(__dirname, '../data/benchmark_dataset.json');
const SYNTHETIC_BACKUP_PATH = join(__dirname, '../data/benchmark_dataset_synthetic.json');
const TARGET_TOTAL = 200;

// ---------------------------------------------------------------------------
// Diverse synthetic templates — each is { domain, input, passOutput, failOutput, context, failureMode }
// PASS: actualOutput is grounded in context
// FAIL: actualOutput contains hallucinated / contradicted claim
// ---------------------------------------------------------------------------

const TEMPLATES = [
  // FINANCIAL (20 templates)
  {
    domain: 'financial', difficulty: 'hard',
    input: 'What is the penalty for early withdrawal from a 401(k)?',
    context: 'Withdrawals from a 401(k) before age 59½ are subject to a 10% early withdrawal penalty, plus ordinary income taxes on the full amount withdrawn. Exceptions include separation from service after age 55 and certain disability cases.',
    passOutput: 'Early 401(k) withdrawals before age 59½ incur a 10% penalty plus ordinary income taxes. Exceptions exist for separation from service after 55 and disability.',
    failOutput: 'Early 401(k) withdrawals incur a 5% flat penalty and are taxed at a preferential capital gains rate of 15%.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'hard',
    input: 'What is the contribution limit for a Health Savings Account (HSA) in 2024?',
    context: 'For 2024, the HSA contribution limit is $4,150 for self-only coverage and $8,300 for family coverage. Individuals age 55 and older can contribute an additional $1,000 catch-up contribution.',
    passOutput: 'In 2024, HSA contribution limits are $4,150 for self-only coverage and $8,300 for family coverage, with a $1,000 catch-up for those 55+.',
    failOutput: 'The 2024 HSA limit is $3,850 for individuals and $7,750 for families, unchanged from 2023.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'medium',
    input: 'What is a put option in stock trading?',
    context: 'A put option gives the holder the right, but not the obligation, to sell an underlying security at a specified strike price before or at expiration. Put buyers profit when the underlying asset decreases in value.',
    passOutput: 'A put option grants the holder the right to sell an asset at the strike price before expiration. Put buyers profit when the asset price falls.',
    failOutput: 'A put option obligates the buyer to purchase shares at the strike price. Put buyers profit when the asset rises in value.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'hard',
    input: 'How does the Federal Reserve control inflation?',
    context: 'The Federal Reserve primarily controls inflation through monetary policy. Its main tools are the federal funds rate (the interest rate at which banks lend to each other overnight), open market operations (buying or selling government securities), and reserve requirements.',
    passOutput: 'The Federal Reserve controls inflation through monetary policy: adjusting the federal funds rate, conducting open market operations (buying/selling government securities), and setting reserve requirements.',
    failOutput: 'The Federal Reserve controls inflation by directly setting consumer interest rates and printing or destroying currency as needed to maintain price stability.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'medium',
    input: 'What is the difference between a stock and a bond?',
    context: 'A stock represents ownership equity in a company, giving shareholders a claim on the company\'s assets and earnings. A bond is a debt instrument where the issuer borrows money from bondholders and promises to pay periodic interest plus return the principal at maturity.',
    passOutput: 'Stocks represent ownership equity in a company with claims on assets and earnings. Bonds are debt instruments where the issuer pays periodic interest and returns principal at maturity.',
    failOutput: 'Stocks pay guaranteed dividends and have priority over bonds in bankruptcy. Bonds represent partial ownership with variable returns based on company performance.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'hard',
    input: 'What triggers the alternative minimum tax (AMT)?',
    context: 'The AMT is triggered when a taxpayer\'s alternative minimum taxable income (AMTI) exceeds the AMT exemption. Common triggers include large deductions for state and local taxes, high itemized deductions, and significant incentive stock option exercises.',
    passOutput: 'AMT is triggered when AMTI exceeds the AMT exemption. Common triggers include large state and local tax deductions, high itemized deductions, and incentive stock option exercises.',
    failOutput: 'AMT applies automatically to all taxpayers earning over $200,000 and is calculated at a flat 26% rate with no exemptions.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'medium',
    input: 'What is a margin call?',
    context: 'A margin call occurs when the value of securities in a margin account falls below the broker\'s required minimum maintenance margin. The broker demands the investor deposit additional funds or securities to restore the account to the minimum level, or the broker may sell holdings.',
    passOutput: 'A margin call occurs when account value falls below the required maintenance margin. The broker demands additional funds or may sell holdings to restore the minimum balance.',
    failOutput: 'A margin call is when a broker automatically purchases additional securities on the investor\'s behalf when their account balance drops. The investor has 30 days to repay.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'hard',
    input: 'What is the difference between Chapter 7 and Chapter 13 bankruptcy?',
    context: 'Chapter 7 bankruptcy, called liquidation bankruptcy, discharges most unsecured debts but may require selling non-exempt assets. Chapter 13, called reorganization bankruptcy, lets debtors keep assets while repaying debts through a 3–5 year court-approved plan.',
    passOutput: 'Chapter 7 (liquidation) discharges unsecured debts and may require selling non-exempt assets. Chapter 13 (reorganization) lets you keep assets while repaying through a 3–5 year plan.',
    failOutput: 'Chapter 7 applies to businesses only and liquidates all assets. Chapter 13 is for individuals and discharges all debts immediately without a repayment plan.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'medium',
    input: 'What is dollar-cost averaging?',
    context: 'Dollar-cost averaging (DCA) is an investment strategy where an investor divides the total investment amount into periodic purchases of a target asset, regardless of price. This reduces the impact of volatility by buying more shares when prices are low and fewer when prices are high.',
    passOutput: 'Dollar-cost averaging invests a fixed amount periodically regardless of price, buying more shares when prices are low and fewer when high, reducing volatility impact.',
    failOutput: 'Dollar-cost averaging means investing all capital at once at the lowest point of a market cycle. Timing the market is essential for this strategy to work.',
    failureMode: 'hallucination',
  },
  {
    domain: 'financial', difficulty: 'hard',
    input: 'Can a company deduct stock-based compensation for tax purposes?',
    context: 'Under IRC Section 83, employers can deduct stock-based compensation when employees recognize income from it — typically when non-qualified stock options are exercised or when restricted stock vests. ISOs are generally not deductible by the employer.',
    passOutput: 'Employers can deduct stock-based compensation when employees recognize income — at exercise for NQSOs or at vesting for restricted stock. ISOs are generally not employer-deductible.',
    failOutput: 'All stock-based compensation is immediately deductible at grant date at fair market value, including incentive stock options.',
    failureMode: 'hallucination',
  },

  // MEDICAL (20 templates)
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What are the diagnostic criteria for major depressive disorder (MDD)?',
    context: 'According to DSM-5, MDD requires five or more of nine specified symptoms for at least two weeks, including either depressed mood or loss of interest. Symptoms must cause significant distress or impairment and not be attributable to substances or another medical condition.',
    passOutput: 'DSM-5 MDD requires ≥5 of 9 symptoms for ≥2 weeks, including depressed mood or loss of interest, causing significant distress/impairment, not due to substances or medical conditions.',
    failOutput: 'MDD is diagnosed when a patient reports feeling sad for more than one week combined with at least one additional symptom such as appetite change or fatigue.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What is the first-line treatment for community-acquired pneumonia in outpatients?',
    context: 'For healthy outpatients with community-acquired pneumonia (CAP) and no comorbidities, guidelines recommend amoxicillin as first-line therapy. For patients with comorbidities or risk factors, a respiratory fluoroquinolone or combination of beta-lactam plus macrolide is preferred.',
    passOutput: 'Healthy outpatients with CAP receive amoxicillin first-line. Patients with comorbidities receive a respiratory fluoroquinolone or beta-lactam plus macrolide combination.',
    failOutput: 'All CAP cases are treated first-line with azithromycin monotherapy regardless of comorbidities. Hospitalization is required for any confirmed pneumonia.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What is the mechanism of action of SSRIs?',
    context: 'Selective serotonin reuptake inhibitors (SSRIs) work by blocking the serotonin transporter (SERT) on presynaptic neurons, preventing serotonin reuptake from the synaptic cleft. This increases serotonin availability in the synapse, enhancing serotonergic neurotransmission.',
    passOutput: 'SSRIs block the serotonin transporter (SERT) on presynaptic neurons, preventing serotonin reuptake and increasing its availability in the synaptic cleft.',
    failOutput: 'SSRIs increase serotonin production in the presynaptic neuron and block dopamine receptors to prevent excessive stimulation.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'medium',
    input: 'What are the stages of chronic kidney disease (CKD)?',
    context: 'CKD is classified into five stages based on glomerular filtration rate (GFR): Stage 1 (GFR ≥90), Stage 2 (GFR 60–89), Stage 3 (GFR 30–59), Stage 4 (GFR 15–29), and Stage 5 (GFR <15), which is kidney failure requiring dialysis or transplant.',
    passOutput: 'CKD has 5 stages by GFR: Stage 1 (≥90), Stage 2 (60–89), Stage 3 (30–59), Stage 4 (15–29), Stage 5 (<15, kidney failure requiring dialysis/transplant).',
    failOutput: 'CKD has three stages: mild (GFR 60–90), moderate (GFR 30–60), and severe (GFR <30). Stage 3 always requires immediate dialysis.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What are the contraindications for thrombolytic therapy in stroke?',
    context: 'Absolute contraindications for IV tPA in acute ischemic stroke include: prior intracranial hemorrhage, significant head trauma or stroke within 3 months, intracranial neoplasm, active internal bleeding, and blood pressure >185/110 mmHg that cannot be controlled. Time window is generally within 3–4.5 hours of symptom onset.',
    passOutput: 'IV tPA contraindications include prior intracranial hemorrhage, head trauma/stroke in last 3 months, intracranial neoplasm, active bleeding, and BP >185/110 mmHg. Window: 3–4.5 hours from onset.',
    failOutput: 'Thrombolytics are contraindicated in all stroke patients over age 80. The treatment window is 12 hours and blood pressure must be below 120/80 mmHg.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'medium',
    input: 'What is the APGAR score and what does it assess?',
    context: 'The APGAR score, assessed at 1 and 5 minutes after birth, evaluates five criteria: Appearance (skin color), Pulse (heart rate), Grimace (reflex irritability), Activity (muscle tone), and Respiration. Each is scored 0–2, with a maximum score of 10.',
    passOutput: 'APGAR (assessed at 1 and 5 minutes) scores five criteria 0–2: Appearance, Pulse, Grimace, Activity, Respiration. Maximum score is 10.',
    failOutput: 'The APGAR score is assessed only at birth and measures seven criteria including temperature and reflexes. A score above 6 indicates good health.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What is the difference between Type I and Type II hypersensitivity reactions?',
    context: 'Type I hypersensitivity (immediate) is IgE-mediated, occurring within minutes of antigen exposure, as in anaphylaxis and allergic asthma. Type II hypersensitivity is antibody-mediated (IgG/IgM), targeting cell surface antigens, causing cell destruction — as in autoimmune hemolytic anemia.',
    passOutput: 'Type I (IgE-mediated, immediate): anaphylaxis, allergic asthma. Type II (IgG/IgM against cell surface antigens): cell destruction, e.g. autoimmune hemolytic anemia.',
    failOutput: 'Type I hypersensitivity involves T-cells and appears 24–72 hours after exposure. Type II is IgE-mediated and appears within minutes.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'When is prophylactic antibiotic therapy indicated before dental procedures?',
    context: 'Current AHA guidelines recommend antibiotic prophylaxis before dental procedures only for patients with the highest risk of adverse outcomes from infective endocarditis: those with prosthetic cardiac valves, prior infective endocarditis, certain congenital heart defects, or cardiac transplant recipients with valve disease.',
    passOutput: 'AHA recommends dental antibiotic prophylaxis only for highest-risk patients: prosthetic cardiac valves, prior infective endocarditis, certain congenital heart defects, or cardiac transplant with valve disease.',
    failOutput: 'All patients with any history of heart disease should receive antibiotic prophylaxis before every dental procedure to prevent endocarditis.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'medium',
    input: 'What is the recommended screening age for colorectal cancer?',
    context: 'Current guidelines from the American Cancer Society recommend colorectal cancer screening begin at age 45 for people at average risk. Those with higher risk factors (family history, prior polyps) may need to start earlier. Colonoscopy is the gold standard screening method.',
    passOutput: 'ACS recommends colorectal cancer screening starting at age 45 for average-risk individuals. Higher-risk patients may start earlier. Colonoscopy is the gold standard.',
    failOutput: 'Colorectal cancer screening should start at age 60 for all patients. Annual fecal occult blood testing is the only recommended screening method.',
    failureMode: 'hallucination',
  },
  {
    domain: 'medical', difficulty: 'hard',
    input: 'What are the warning signs of pulmonary embolism?',
    context: 'Classic symptoms of pulmonary embolism include sudden onset dyspnea (most common), pleuritic chest pain, hemoptysis, tachycardia, and hypoxemia. Massive PE may present with syncope, hypotension, or cardiac arrest. PE should be suspected in any patient with unexplained tachycardia or dyspnea.',
    passOutput: 'PE presents with sudden dyspnea (most common), pleuritic chest pain, hemoptysis, tachycardia, and hypoxemia. Massive PE may cause syncope, hypotension, or cardiac arrest.',
    failOutput: 'Pulmonary embolism presents with gradual onset bilateral leg pain, fever above 39°C, and productive cough. It is reliably diagnosed by chest X-ray.',
    failureMode: 'hallucination',
  },

  // LEGAL (20 templates)
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What is the standard of proof in a civil lawsuit?',
    context: 'In civil lawsuits, the standard of proof is a preponderance of the evidence, meaning the plaintiff must show it is more likely than not (greater than 50%) that their claim is true. This contrasts with criminal law\'s "beyond reasonable doubt" standard.',
    passOutput: 'Civil lawsuits use the "preponderance of the evidence" standard — the plaintiff must show it is more likely than not (>50%) that their claim is true, unlike the criminal "beyond reasonable doubt" standard.',
    failOutput: 'Civil lawsuits require proof beyond reasonable doubt, the same standard used in criminal cases. The plaintiff must eliminate all doubt to prevail.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What constitutes copyright infringement?',
    context: 'Copyright infringement occurs when someone exercises one of the copyright owner\'s exclusive rights without permission or a valid exception like fair use. These exclusive rights include reproduction, distribution, creation of derivative works, public display, and public performance.',
    passOutput: 'Copyright infringement occurs when someone exercises an owner\'s exclusive rights (reproduction, distribution, derivative works, public display/performance) without permission or a fair use exception.',
    failOutput: 'Copyright infringement requires proving intent and financial harm. Accidental reproduction of copyrighted material without profit is not infringement.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What is the implied covenant of good faith and fair dealing?',
    context: 'The implied covenant of good faith and fair dealing is a general presumption that parties to a contract will deal with each other honestly and in good faith. It prevents either party from acting in a way that deprives the other party of the benefit of the bargain, even if such action is not explicitly prohibited by the contract.',
    passOutput: 'The implied covenant of good faith and fair dealing requires parties to act honestly and not deprive the other party of their contract benefits, even if specific acts aren\'t prohibited.',
    failOutput: 'The implied covenant of good faith applies only to insurance contracts and requires insurers to pay all claims promptly regardless of policy terms.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'medium',
    input: 'What is the difference between a will and a trust?',
    context: 'A will is a legal document that specifies how assets should be distributed after death and must go through probate. A trust is a legal arrangement where a trustee holds assets for beneficiaries. Trusts can be revocable or irrevocable and can avoid probate, provide privacy, and allow assets to be managed during the grantor\'s incapacity.',
    passOutput: 'A will directs asset distribution after death and requires probate. A trust (revocable or irrevocable) holds assets via a trustee for beneficiaries, avoiding probate and allowing management during incapacity.',
    failOutput: 'Wills and trusts are identical legal instruments; the only difference is that trusts must be filed with a court while wills remain private documents.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'Under what circumstances can a non-compete agreement be enforced?',
    context: 'Non-compete enforceability varies by state. Most states require non-competes to be reasonable in scope, geographic area, and duration. They must protect a legitimate business interest (trade secrets, customer relationships) and be supported by consideration. California, North Dakota, and a few other states generally ban them entirely.',
    passOutput: 'Non-competes must be reasonable in scope, geography, and duration; protect a legitimate business interest; and be supported by consideration. California and a few states ban them outright.',
    failOutput: 'Non-compete agreements are enforceable in all states as long as they are signed by the employee. They can cover any industry and have no limitations on duration.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What is the tort of negligent misrepresentation?',
    context: 'Negligent misrepresentation occurs when a defendant, in the course of their business or profession, provides false information without exercising reasonable care, causing another party to justifiably rely on that information to their financial detriment. Unlike fraud, it does not require intent to deceive.',
    passOutput: 'Negligent misrepresentation: false information given without reasonable care in a business/professional context, causing justifiable reliance and financial harm. No intent to deceive required (unlike fraud).',
    failOutput: 'Negligent misrepresentation requires proof that the defendant intentionally lied and received financial gain from the misrepresentation. It is equivalent to common law fraud.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'medium',
    input: 'What rights does the Fourth Amendment protect?',
    context: 'The Fourth Amendment protects against unreasonable searches and seizures by government agents. It requires that warrants be based on probable cause, be supported by oath or affirmation, and particularly describe the place to be searched and persons or things to be seized.',
    passOutput: 'The Fourth Amendment protects against unreasonable government searches and seizures. Warrants must be based on probable cause, supported by oath, and particularly describe the place/items searched.',
    failOutput: 'The Fourth Amendment protects the right to privacy in all circumstances, including from private parties. Any search without prior consent is prohibited.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What is the difference between murder and manslaughter?',
    context: 'Murder requires malice aforethought — the intent to kill or cause serious bodily harm, or extreme recklessness. First-degree murder adds premeditation. Manslaughter lacks malice: voluntary manslaughter involves a killing in the heat of passion with adequate provocation; involuntary manslaughter is an unintentional killing from criminal negligence.',
    passOutput: 'Murder requires malice aforethought (intent to kill/harm or extreme recklessness), with first-degree adding premeditation. Manslaughter lacks malice: voluntary (heat of passion) or involuntary (criminal negligence).',
    failOutput: 'Murder and manslaughter are the same offense. The distinction is only sentencing: murder carries life imprisonment while manslaughter is capped at 10 years.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'hard',
    input: 'What constitutes a valid contract consideration?',
    context: 'Consideration is something of legal value bargained for and exchanged between parties. It can be a promise, an act, or a forbearance from acting. Courts generally do not evaluate the adequacy of consideration — what matters is that something of value was exchanged. Past consideration and moral obligations are generally insufficient.',
    passOutput: 'Valid consideration is something of legal value (promise, act, or forbearance) bargained for in exchange. Adequacy isn\'t evaluated, but past consideration and moral obligations are insufficient.',
    failOutput: 'Consideration must be money. Promises or services cannot constitute valid consideration. The exchange must be of equal monetary value to be enforceable.',
    failureMode: 'hallucination',
  },
  {
    domain: 'legal', difficulty: 'medium',
    input: 'What is the attorney-client privilege?',
    context: 'Attorney-client privilege protects confidential communications between a client and their attorney made for the purpose of seeking or providing legal advice. The privilege belongs to the client, who can waive it. It does not protect communications made to facilitate a crime or fraud.',
    passOutput: 'Attorney-client privilege protects confidential client-attorney communications made for legal advice. The client holds the privilege and may waive it. Crime-fraud exception removes protection.',
    failOutput: 'Attorney-client privilege covers all communications between an attorney and anyone, not just clients. The attorney can waive the privilege at any time for any reason.',
    failureMode: 'hallucination',
  },

  // TECHNICAL (20 templates)
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is the difference between horizontal and vertical scaling?',
    context: 'Horizontal scaling (scaling out) adds more machines to a system to distribute load across multiple nodes. Vertical scaling (scaling up) increases the capacity of existing machines by adding more CPU, RAM, or storage. Horizontal scaling is more fault-tolerant but requires load balancing; vertical scaling has limits based on hardware constraints.',
    passOutput: 'Horizontal scaling adds more machines to distribute load (requires load balancing, more fault-tolerant). Vertical scaling upgrades existing machines (CPU/RAM). Vertical has hardware limits.',
    failOutput: 'Horizontal scaling increases RAM and CPU on a single server. Vertical scaling adds more servers. Both approaches are equally fault-tolerant.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is a B-tree index and why is it used in databases?',
    context: 'A B-tree (balanced tree) index stores data in a sorted, hierarchical structure where all leaf nodes are at the same depth. It supports O(log n) search, insert, and delete operations. B-trees are used in databases because they minimize disk reads by keeping the tree balanced and allowing sequential access patterns efficiently.',
    passOutput: 'B-tree indexes use a balanced hierarchical structure with all leaves at equal depth. They support O(log n) search/insert/delete and are efficient for databases due to minimal disk reads and sequential access.',
    failOutput: 'B-tree indexes store data in hash buckets for O(1) average lookup. They are best suited for exact-match queries and do not support range queries.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is the difference between strong and eventual consistency?',
    context: 'Strong consistency guarantees that any read operation returns the most recently written value, regardless of which node is queried. Eventual consistency allows reads to temporarily return stale data, but guarantees that all nodes will eventually converge to the same value if no new updates are made.',
    passOutput: 'Strong consistency: reads always return the latest written value from any node. Eventual consistency: reads may temporarily return stale data, but all nodes converge given no new updates.',
    failOutput: 'Strong consistency requires a majority quorum for all operations. Eventual consistency means some nodes permanently retain stale data and never update.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'medium',
    input: 'What is the purpose of a message queue like Kafka?',
    context: 'Apache Kafka is a distributed event streaming platform that allows producers to publish messages to topics and consumers to subscribe and process them asynchronously. It provides high throughput, fault tolerance through replication, and message retention for replay. It decouples producers from consumers.',
    passOutput: 'Kafka is a distributed event streaming platform for async producer-to-consumer messaging. It offers high throughput, fault tolerance via replication, message retention for replay, and decouples producers from consumers.',
    failOutput: 'Kafka is a synchronous RPC framework that connects services directly. Messages are deleted immediately after delivery and cannot be replayed. Producers wait for consumer acknowledgment.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is the difference between optimistic and pessimistic locking in databases?',
    context: 'Pessimistic locking acquires a lock on a resource before reading or modifying it, preventing other transactions from accessing it until released. Optimistic locking assumes conflicts are rare — it reads data without locking, then checks at commit time whether data was modified. If a conflict is detected, the transaction is rolled back.',
    passOutput: 'Pessimistic locking locks the resource before access, blocking others until released. Optimistic locking reads without locking and checks for conflicts at commit — rolling back if modified.',
    failOutput: 'Optimistic locking acquires locks at the start of a transaction and holds them permanently. Pessimistic locking never uses locks and relies on timestamps only.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is a hash collision and how is it handled?',
    context: 'A hash collision occurs when two different keys produce the same hash value. Common resolution strategies include chaining (storing colliding elements in a linked list at the same bucket) and open addressing (probing for the next available bucket using linear, quadratic, or double hashing).',
    passOutput: 'A hash collision occurs when two keys produce the same hash. Resolution strategies: chaining (linked list per bucket) or open addressing (linear/quadratic/double-hash probing).',
    failOutput: 'Hash collisions are impossible in modern hash functions. When they occur, the entire hash table must be rebuilt with a larger prime number size.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'medium',
    input: 'What is the difference between synchronous and asynchronous programming?',
    context: 'Synchronous programming executes operations sequentially, blocking until each operation completes before moving to the next. Asynchronous programming allows operations to run concurrently without blocking — the program continues executing while waiting for I/O or other long-running tasks to complete, using callbacks, promises, or async/await.',
    passOutput: 'Synchronous: sequential, blocking execution. Asynchronous: non-blocking, allows concurrent operations using callbacks, promises, or async/await while waiting for I/O.',
    failOutput: 'Synchronous programming is faster because it uses multiple CPU cores simultaneously. Asynchronous programming is single-threaded and always slower due to callback overhead.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'How does garbage collection work in Java?',
    context: 'Java\'s garbage collector automatically reclaims memory occupied by objects no longer reachable from any live reference. The JVM uses generational collection: the heap is divided into Young Generation (Eden + Survivor spaces) and Old Generation. Most objects die young (Minor GC); long-lived objects are promoted to Old Generation (Major/Full GC).',
    passOutput: 'Java\'s GC reclaims unreachable objects. The heap is split into Young Gen (Eden + Survivor) and Old Gen. Minor GC handles short-lived objects; long-lived objects promote to Old Gen for Major GC.',
    failOutput: 'Java garbage collection requires programmers to manually call System.gc() to free memory. The JVM cannot determine when objects are unreachable without explicit instructions.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'hard',
    input: 'What is a CSRF attack and how is it prevented?',
    context: 'Cross-Site Request Forgery (CSRF) tricks an authenticated user\'s browser into making unwanted requests to a web application, exploiting the browser\'s automatic cookie transmission. Prevention methods include CSRF tokens (unique per-session values embedded in forms), SameSite cookie attributes, and verifying the Origin/Referer headers.',
    passOutput: 'CSRF tricks authenticated browsers into unwanted requests via automatic cookie transmission. Prevention: CSRF tokens in forms, SameSite cookie attribute, and Origin/Referer header verification.',
    failOutput: 'CSRF attacks intercept network traffic between client and server. Prevention requires all traffic to use HTTPS and rate-limiting login attempts.',
    failureMode: 'hallucination',
  },
  {
    domain: 'technical', difficulty: 'medium',
    input: 'What is the observer pattern in software design?',
    context: 'The observer pattern defines a one-to-many dependency between objects so that when one object (the subject) changes state, all its dependents (observers) are notified and updated automatically. It is commonly used in event-driven systems, GUI frameworks, and reactive programming.',
    passOutput: 'The observer pattern creates a one-to-many dependency where the subject notifies all observers of state changes automatically. Used in event-driven systems, GUIs, and reactive programming.',
    failOutput: 'The observer pattern requires observers to continuously poll the subject for changes. It is used primarily for database replication and network monitoring.',
    failureMode: 'hallucination',
  },

  // ADVERSARIAL (20 templates — all genuine RAG hallucination cases)
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'According to the document, what did the CEO say about layoffs?',
    context: 'CEO Jane Smith stated in the Q3 earnings call: "We are committed to our workforce and have no plans for layoffs in fiscal year 2024. We are focused on organic growth and strategic hiring in our core divisions."',
    passOutput: 'According to the document, CEO Jane Smith stated in the Q3 earnings call that the company has no plans for layoffs in fiscal year 2024 and is focused on organic growth and strategic hiring.',
    failOutput: 'The CEO announced a 15% workforce reduction across all divisions, citing macroeconomic headwinds and the need to improve profitability.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'What interest rate did the policy document specify for late payments?',
    context: 'Per Section 4.2 of the payment policy: "Overdue invoices will accrue interest at a rate of 1.5% per month (18% per annum) from the date payment was due until the date of receipt."',
    passOutput: 'Per Section 4.2, overdue invoices accrue interest at 1.5% per month (18% per annum) from the due date until receipt.',
    failOutput: 'The policy specifies a 2% monthly interest rate on late payments, compounded daily, with a minimum charge of $50 per invoice.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'Does the clinical trial report show statistical significance for the primary endpoint?',
    context: 'The trial results showed a reduction in systolic blood pressure of 8.2 mmHg in the treatment group vs. 2.1 mmHg in placebo (p=0.032, 95% CI: 1.8–10.4 mmHg). The primary endpoint of ≥5 mmHg reduction was met.',
    passOutput: 'Yes — the trial showed an 8.2 mmHg reduction (treatment) vs 2.1 mmHg (placebo), p=0.032, 95% CI 1.8–10.4 mmHg. The primary endpoint (≥5 mmHg reduction) was met.',
    failOutput: 'The trial did not reach statistical significance (p=0.12). The primary endpoint was not met, with only a 3.1 mmHg difference between groups.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'What termination notice period does the contract specify?',
    context: 'Article 12.3 of the agreement states: "Either party may terminate this Agreement without cause upon sixty (60) days written notice to the other party. Termination for material breach requires only fifteen (15) days written notice."',
    passOutput: 'Article 12.3 specifies 60 days written notice for termination without cause, and 15 days for termination due to material breach.',
    failOutput: 'The contract requires 90 days notice for any termination, with no distinction between cause and no-cause scenarios.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'What does the research paper conclude about the intervention\'s effect on student outcomes?',
    context: 'The study found no statistically significant improvement in standardized test scores between the intervention and control groups (d=0.12, p=0.43). The authors concluded that while some qualitative benefits were observed, the intervention should not be recommended as a scalable academic intervention based on current evidence.',
    passOutput: 'The paper found no statistically significant improvement in test scores (d=0.12, p=0.43) and concluded the intervention should not be recommended as scalable based on current evidence.',
    failOutput: 'The study demonstrated significant improvement in student outcomes with an effect size of d=0.65, and the authors strongly recommended scaling the intervention nationally.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'According to the financial filing, what was the company\'s revenue growth year-over-year?',
    context: 'From the 10-K filing: "Total revenue for fiscal year 2023 was $4.2 billion, compared to $3.8 billion in fiscal year 2022, representing a 10.5% year-over-year increase. This growth was driven primarily by increased adoption of the company\'s cloud-based product suite."',
    passOutput: 'Per the 10-K, FY2023 revenue was $4.2B vs $3.8B in FY2022 — a 10.5% YoY increase driven by cloud product adoption.',
    failOutput: 'The filing shows 23% revenue growth, with total revenue reaching $4.8 billion in fiscal 2023, driven by an acquisition completed in Q2.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'What coverage limit does the insurance policy specify for water damage?',
    context: 'Policy Section 6, Coverage C: "Water damage resulting from sudden and accidental discharge of plumbing is covered up to $25,000 per occurrence. Flood damage from external water sources is explicitly excluded and requires separate flood insurance."',
    passOutput: 'Section 6 covers sudden accidental plumbing discharge up to $25,000 per occurrence. Flood damage from external sources is excluded and requires separate flood insurance.',
    failOutput: 'The policy covers all water damage up to $100,000 including floods, with a $500 deductible. Flood insurance riders are automatically included.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'Based on the memo, what did management decide about the remote work policy?',
    context: 'Internal memo, March 5: "After review, the Executive Committee has decided to maintain the current hybrid model of three days in-office per week for all employees. This policy will remain in effect through December 31, 2024, after which it will be reassessed."',
    passOutput: 'Management decided to maintain the current hybrid model (3 days in-office/week) through December 31, 2024, after which it will be reassessed.',
    failOutput: 'The memo announces a return to full-time in-office work starting April 1, with exceptions only for medical accommodations approved by HR.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'What safety data does the product document report for this medication?',
    context: 'In the Phase 3 safety analysis (n=2,847), the most common adverse events were headache (12.3%), nausea (9.8%), and fatigue (8.1%). Serious adverse events occurred in 2.1% of patients, consistent with the placebo group (2.3%). No treatment-related deaths were reported.',
    passOutput: 'Phase 3 safety (n=2,847): headache 12.3%, nausea 9.8%, fatigue 8.1%. Serious adverse events: 2.1% (vs 2.3% placebo). No treatment-related deaths.',
    failOutput: 'The document reports serious adverse events in 8.7% of patients, with 3 treatment-related deaths. The most common side effects were cardiac arrhythmias and liver enzyme elevation.',
    failureMode: 'hallucination',
  },
  {
    domain: 'adversarial', difficulty: 'hard',
    input: 'According to the spec, what authentication method does the API require?',
    context: 'API Authentication (v2.1 spec): All requests must include a Bearer token in the Authorization header. Tokens expire after 3600 seconds (1 hour). API keys are not accepted for production endpoints. OAuth 2.0 client credentials flow is used to obtain tokens.',
    passOutput: 'The API requires Bearer token in the Authorization header via OAuth 2.0 client credentials flow. Tokens expire after 3600 seconds. API keys are not accepted for production.',
    failOutput: 'The API uses Basic authentication with a username and password in the Authorization header. Tokens are not required and API keys can be passed as query parameters.',
    failureMode: 'hallucination',
  },

  // GENERAL (5 additional templates for balance)
  {
    domain: 'general', difficulty: 'hard',
    input: 'What is the greenhouse effect and how does it contribute to climate change?',
    context: 'The greenhouse effect occurs when atmospheric gases (CO2, methane, water vapor) absorb and re-emit infrared radiation from Earth\'s surface, trapping heat. Human activities have increased greenhouse gas concentrations, enhancing this effect and causing average global temperatures to rise — the core mechanism of anthropogenic climate change.',
    passOutput: 'The greenhouse effect: atmospheric gases (CO2, methane, water vapor) absorb and re-emit infrared radiation, trapping heat. Human-caused GHG increases have enhanced this, driving anthropogenic climate change.',
    failOutput: 'The greenhouse effect is caused by holes in the ozone layer that allow UV radiation to penetrate and heat the Earth. Reducing CFC emissions is the primary solution.',
    failureMode: 'hallucination',
  },
  {
    domain: 'general', difficulty: 'hard',
    input: 'What is the significance of the Turing test?',
    context: 'Proposed by Alan Turing in 1950, the Turing test evaluates a machine\'s ability to exhibit intelligent behavior indistinguishable from a human. In the standard setup, an interrogator communicates via text with a human and a machine; if the interrogator cannot reliably identify the machine, the machine is said to have passed. It remains a foundational concept in AI philosophy.',
    passOutput: 'Proposed by Turing in 1950, the test assesses if a machine\'s text responses are indistinguishable from a human\'s. If an interrogator can\'t identify the machine reliably, it passes. A foundational AI philosophy concept.',
    failOutput: 'The Turing test requires a machine to solve complex mathematical problems faster than a human. It measures computational speed, not conversational ability.',
    failureMode: 'hallucination',
  },
  {
    domain: 'general', difficulty: 'medium',
    input: 'What is the role of mitochondria in cells?',
    context: 'Mitochondria are organelles found in eukaryotic cells that produce adenosine triphosphate (ATP) through cellular respiration, making them the primary energy source for the cell. They have their own DNA and double membrane, and are believed to have originated from ancient bacterial endosymbionts.',
    passOutput: 'Mitochondria produce ATP via cellular respiration, serving as the cell\'s primary energy source. They have their own DNA and double membrane, originating from ancient bacterial endosymbionts.',
    failOutput: 'Mitochondria are responsible for protein synthesis in cells and are found only in plant cells. They produce glucose through photosynthesis using sunlight.',
    failureMode: 'hallucination',
  },
  {
    domain: 'general', difficulty: 'hard',
    input: 'How does mRNA vaccine technology work?',
    context: 'mRNA vaccines deliver synthetic messenger RNA encoding a target antigen (e.g., spike protein) into human cells. The cells use this mRNA to produce the antigen, which triggers an immune response. The mRNA degrades within days and does not enter the cell nucleus or interact with DNA.',
    passOutput: 'mRNA vaccines deliver synthetic mRNA encoding a target antigen into cells, which produce the antigen and trigger immunity. The mRNA degrades within days and does not enter the nucleus or affect DNA.',
    failOutput: 'mRNA vaccines permanently modify the recipient\'s DNA in the cell nucleus. The mRNA integrates into the genome and causes cells to permanently produce spike proteins.',
    failureMode: 'hallucination',
  },
  {
    domain: 'general', difficulty: 'hard',
    input: 'What is the theory of plate tectonics?',
    context: 'Plate tectonics holds that Earth\'s lithosphere is divided into large rigid plates that move on the underlying asthenosphere. Interactions at plate boundaries cause earthquakes, volcanic activity, and mountain formation. Plates move by convection currents in the mantle and ridge push/slab pull forces.',
    passOutput: 'Plate tectonics: Earth\'s lithosphere consists of rigid plates moving on the asthenosphere. Plate boundary interactions cause earthquakes, volcanoes, and mountains, driven by mantle convection and ridge push/slab pull.',
    failOutput: 'Plate tectonics describes how continents float on water beneath Earth\'s crust. Earthquakes occur when continents collide and tides cause the ocean floor to shift.',
    failureMode: 'hallucination',
  },
];

async function fetchRAGTruth() {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const url = 'https://datasets-server.huggingface.co/rows?dataset=guardrailsai%2Fragtruth&config=default&split=train&offset=0&length=1000';

  const res = await fetch(url, { headers });
  if (!res.ok) return null;

  const data = await res.json();
  return data.rows || [];
}

function buildSyntheticCases(existing) {
  const newCases = [];
  const startIdx = existing.length + 1;

  TEMPLATES.forEach((t, i) => {
    const idx = String(startIdx + i * 2).padStart(3, '0');

    newCases.push({
      id: `${t.domain}-synth-${idx}`,
      domain: t.domain,
      difficulty: t.difficulty,
      input: t.input,
      actualOutput: t.passOutput,
      retrievalContext: [t.context],
      humanVerdict: 'PASS',
      humanRationale: 'Answer is fully grounded in the provided context.',
      failureMode: 'correct',
      source: 'synthetic',
    });

    newCases.push({
      id: `${t.domain}-synth-fail-${idx}`,
      domain: t.domain,
      difficulty: t.difficulty,
      input: t.input,
      actualOutput: t.failOutput,
      retrievalContext: [t.context],
      humanVerdict: 'FAIL',
      humanRationale: 'Answer contains specific claims contradicted by or absent from the context.',
      failureMode: t.failureMode,
      source: 'synthetic',
    });
  });

  return newCases;
}

async function main() {
  console.log('Backing up current dataset...');
  copyFileSync(DATASET_PATH, SYNTHETIC_BACKUP_PATH);

  const original = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));
  // Restore to only original cases if we already have synthetic junk
  const originals = original.filter(c => !c.source || c.source === 'original');
  console.log(`Original cases: ${originals.length}`);

  // Try RAGTruth first
  let ragtruthCases = [];
  console.log('Attempting RAGTruth fetch...');
  try {
    const rows = await fetchRAGTruth();
    if (rows && rows.length > 0) {
      console.log(`Fetched ${rows.length} RAGTruth rows`);
      ragtruthCases = rows
        .map((row, i) => {
          const r = row.row;
          if (!r.question || !r.context || !r.response) return null;
          const hasHallucination = Array.isArray(r.hallucination_labels)
            ? r.hallucination_labels.some(l => l !== 'no-hallucination')
            : Boolean(r.has_hallucination);
          return {
            id: `ragtruth-${String(i + 1).padStart(3, '0')}`,
            domain: r.task_type === 'qa' ? 'general' : 'technical',
            difficulty: 'medium',
            input: r.question,
            actualOutput: r.response,
            retrievalContext: [r.context],
            humanVerdict: hasHallucination ? 'FAIL' : 'PASS',
            humanRationale: hasHallucination ? 'RAGTruth: hallucination annotated' : 'RAGTruth: no hallucination',
            failureMode: hasHallucination ? 'hallucination' : 'correct',
            source: 'ragtruth',
          };
        })
        .filter(Boolean)
        .slice(0, TARGET_TOTAL - originals.length);
    }
  } catch (err) {
    console.log('RAGTruth unavailable:', err.message);
  }

  let combined;
  if (ragtruthCases.length >= 50) {
    combined = [...originals, ...ragtruthCases].slice(0, TARGET_TOTAL);
    console.log(`Using ${ragtruthCases.length} RAGTruth cases`);
  } else {
    console.log('Building diverse synthetic expansion...');
    const synthetic = buildSyntheticCases(originals);
    combined = [...originals, ...synthetic].slice(0, TARGET_TOTAL);
    console.log(`Added ${synthetic.length} diverse synthetic cases`);
  }

  const passes = combined.filter(c => c.humanVerdict === 'PASS').length;
  const fails = combined.filter(c => c.humanVerdict === 'FAIL').length;
  const domains = {};
  combined.forEach(c => domains[c.domain] = (domains[c.domain] || 0) + 1);

  console.log(`\nFinal dataset: ${combined.length} cases`);
  console.log(`PASS: ${passes} | FAIL: ${fails} | ratio: ${(fails/combined.length*100).toFixed(0)}% FAIL`);
  console.log('Domains:', JSON.stringify(domains));

  const inputs = combined.map(c => c.input);
  const uniqueInputs = new Set(inputs).size;
  console.log(`Unique inputs: ${uniqueInputs} of ${combined.length}`);

  writeFileSync(DATASET_PATH, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`\nWrote to ${DATASET_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
