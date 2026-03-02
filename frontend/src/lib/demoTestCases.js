export const DEMO_TEST_CASES = [
  {
    input: "What medication dosage is appropriate for treating hypertension in elderly patients?",
    actualOutput: "For elderly patients with hypertension, initial treatment typically begins with a low dose of amlodipine (2.5-5mg daily) or lisinopril (5-10mg daily). The dosage should be titrated gradually based on blood pressure response and tolerability. Combination therapy may be needed if monotherapy is insufficient.",
    expectedOutput: "Treatment should start with low-dose monotherapy, typically amlodipine 2.5-5mg or an ACE inhibitor, with gradual titration.",
    retrievalContext: [
      "JNC 8 guidelines recommend initiating antihypertensive therapy in patients aged 60 and older when blood pressure exceeds 150/90 mmHg. First-line options include thiazide diuretics, calcium channel blockers (amlodipine), ACE inhibitors, or ARBs.",
      "In elderly patients, amlodipine is commonly started at 2.5mg daily due to increased sensitivity to vasodilatory effects. Dose may be increased to 5-10mg based on response.",
      "ACE inhibitors such as lisinopril should be initiated at lower doses (5-10mg) in elderly patients due to age-related decline in renal function."
    ]
  },
  {
    input: "What are the legal requirements for forming a limited liability company in Delaware?",
    actualOutput: "To form an LLC in Delaware, you must file a Certificate of Formation with the Delaware Division of Corporations, pay the $90 filing fee, designate a registered agent in Delaware, and create an operating agreement.",
    expectedOutput: "File Certificate of Formation, pay $90 fee, appoint registered agent, create operating agreement.",
    retrievalContext: [
      "Delaware LLC formation requires filing a Certificate of Formation with the Division of Corporations. The filing fee is $90 as of 2024.",
      "Delaware does not require LLCs to list members or managers in the Certificate of Formation, providing privacy protection.",
      "Delaware LLCs are subject to an annual tax of $300, due by June 1st each year."
    ]
  },
  {
    input: "How does the process of cellular respiration produce ATP?",
    actualOutput: "Cellular respiration produces ATP through three main stages: glycolysis (2 ATP), the Krebs cycle (2 ATP), and the electron transport chain (approximately 34 ATP).",
    retrievalContext: [
      "Glycolysis occurs in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules, producing a net gain of 2 ATP and 2 NADH.",
      "The Krebs cycle takes place in the mitochondrial matrix. Each turn produces 1 ATP, 3 NADH, and 1 FADH2.",
      "The electron transport chain uses electrons from NADH and FADH2 to create a proton gradient, producing approximately 34 ATP molecules per glucose."
    ]
  },
  {
    input: "What are the main differences between TCP and UDP protocols?",
    actualOutput: "TCP is a connection-oriented protocol that ensures reliable delivery through handshaking, sequencing, and acknowledgment. UDP is connectionless, offering faster but unreliable delivery.",
    retrievalContext: [
      "TCP is a connection-oriented protocol that establishes a reliable connection using a three-way handshake.",
      "UDP is a connectionless protocol that sends data without establishing a connection.",
      "Common TCP applications include HTTP/HTTPS, email (SMTP), and file transfer (FTP). UDP is used for DNS queries, video streaming, and gaming."
    ]
  },
  {
    input: "What is the recommended investment allocation for a conservative retirement portfolio?",
    actualOutput: "A conservative retirement portfolio typically allocates 60-70% to bonds, 20-30% to equities, and 5-10% to cash equivalents.",
    expectedOutput: "Heavy bond allocation (60-70%), limited equity exposure (20-30%), small cash position.",
    retrievalContext: [
      "Conservative portfolio theory suggests 60-70% allocation to fixed-income instruments.",
      "The equity portion (20-30%) should focus on large-cap dividend-paying stocks.",
      "Financial advisors recommend maintaining 5-10% in cash or cash equivalents."
    ]
  },
  {
    input: "What is the capital of Japan?",
    actualOutput: "The capital of Japan is Tokyo.",
    expectedOutput: "Tokyo",
    retrievalContext: [
      "Tokyo is the capital city of Japan and the most populous metropolitan area in the world."
    ]
  },
  {
    input: "Who invented the telephone?",
    actualOutput: "Alexander Graham Bell is credited with inventing the telephone in 1876.",
    expectedOutput: "Alexander Graham Bell",
    retrievalContext: [
      "Alexander Graham Bell was a Scottish-born inventor who patented the first practical telephone on March 7, 1876."
    ]
  },
  {
    input: "What is the current GDP of the European Union?",
    actualOutput: "The European Union's GDP is approximately $16.6 trillion as of 2023.",
    retrievalContext: [
      "According to World Bank data from 2019, the EU's combined GDP was approximately $15.6 trillion.",
      "The EU economy experienced a significant contraction in 2020 due to COVID-19, declining by approximately 6.1%."
    ]
  },
  {
    input: "How does a neural network learn?",
    actualOutput: "Neural networks learn through backpropagation, adjusting connection weights to minimize prediction errors via gradient descent.",
    expectedOutput: "Neural networks use backpropagation and gradient descent to iteratively adjust weights and minimize prediction errors.",
    retrievalContext: [
      "Neural networks learn by adjusting weights through backpropagation.",
      "Gradient descent minimizes the loss function by computing partial derivatives.",
      "Training requires many epochs and uses techniques like learning rate scheduling and dropout.",
      "Key factors include architecture choice, hyperparameter tuning, and data quality."
    ]
  },
  {
    input: "What safety precautions should be followed when handling concentrated sulfuric acid?",
    actualOutput: "When handling concentrated sulfuric acid, always wear chemical-resistant gloves, safety goggles, and a lab coat. Always add acid to water, never water to acid.",
    retrievalContext: [
      "Concentrated sulfuric acid (>96%) is highly corrosive. Appropriate PPE includes acid-resistant gloves, splash-proof goggles, and a chemical-resistant apron.",
      "The dilution of concentrated sulfuric acid is highly exothermic. ALWAYS add acid to water slowly.",
      "Emergency procedures: flush affected area with water for at least 15 minutes. Seek medical attention for all exposures."
    ]
  }
];
