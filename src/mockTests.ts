import { MockQuestion, MockTestSet } from "./types";

// ══════════════════════════════════════════════════════════════
// MOCK TEST 1
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_1: MockTestSet = {
  id: "mock_1",
  title: "Mock Test 1",
  description: "Uy, birinchi o'qituvchi, sport va sog'lom ovqat",
  questions: [
    // QISM 1.1 — 3 shaxsiy savollar, 30s
    { id: "m1_1.1.1", part: "Qism 1.1", text: "Describe your room / house / flat. Where do you live?", timeLimit: 30 },
    { id: "m1_1.1.2", part: "Qism 1.1", text: "Tell me about your first teacher.", timeLimit: 30 },
    { id: "m1_1.1.3", part: "Qism 1.1", text: "Do you like / play any sports? What is your favorite sport?", timeLimit: 30 },
    // QISM 1.2 — rasm taqqoslash, Q1=45s, Q2-3=30s
    {
      id: "m1_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m1_1.2.2", part: "Qism 1.2", text: "Why do many people try to eat healthy food?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m1_1.2.3", part: "Qism 1.2", text: "Why do some people choose fast food?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    // QISM 2 — 60s prep, 120s javob
    {
      id: "m1_2.1", part: "Qism 2", text: "Describe a time you shared a secret with someone.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "Who did you share it with?",
        "Why did you decide to tell them?",
        "How did you feel after sharing it?",
        "And explain whether you think it's important to keep secrets.",
      ],
    },
    // QISM 3 — FOR/AGAINST, 60s prep, 120s javob
    {
      id: "m1_3.1", part: "Qism 3", text: "Public transport should be free for everyone.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Public transport should be free for everyone.",
        for: [
          "Reduces traffic congestion",
          "Helps the environment (less pollution)",
          "Makes travel accessible for low-income people",
        ],
        against: [
          "Too expensive for government",
          "May lead to overcrowding",
          "People might not value it",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 2
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_2: MockTestSet = {
  id: "mock_2",
  title: "Mock Test 2",
  description: "Dam olish, hobbilar, samolyot va poyezd",
  questions: [
    { id: "m2_1.1.1", part: "Qism 1.1", text: "What do you do on weekends?", timeLimit: 30 },
    { id: "m2_1.1.2", part: "Qism 1.1", text: "What is your (favorite) hobby?", timeLimit: 30 },
    { id: "m2_1.1.3", part: "Qism 1.1", text: "What do you do in your free time?", timeLimit: 30 },
    {
      id: "m2_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1436491865332-7a61a109db05?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m2_1.2.2", part: "Qism 1.2", text: "What are the advantages of travelling by plane?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1436491865332-7a61a109db05?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m2_1.2.3", part: "Qism 1.2", text: "Why do some people prefer travelling by train?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1436491865332-7a61a109db05?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m2_2.1", part: "Qism 2", text: "Describe a time you felt truly happy.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "When and where did it happen?",
        "What made you feel happy?",
        "Who was with you?",
        "And explain why this moment was special for you.",
      ],
    },
    {
      id: "m2_3.1", part: "Qism 3", text: "Handwriting should still be taught in schools.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Handwriting should still be taught in schools.",
        for: [
          "Improves brain development/fine motor skills",
          "Important for exams/signatures",
          "Builds discipline and focus",
        ],
        against: [
          "Digital typing is faster/modern",
          "Most work is on computers now",
          "Time better spent on other skills",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 3
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_3: MockTestSet = {
  id: "mock_3",
  title: "Mock Test 3",
  description: "Ovqat, kechki vaqt, supermarket va bozor",
  questions: [
    { id: "m3_1.1.1", part: "Qism 1.1", text: "What is your favorite food? What do you eat for breakfast?", timeLimit: 30 },
    { id: "m3_1.1.2", part: "Qism 1.1", text: "What do you do in the evenings?", timeLimit: 30 },
    { id: "m3_1.1.3", part: "Qism 1.1", text: "Describe your hometown / town / neighborhood.", timeLimit: 30 },
    {
      id: "m3_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m3_1.2.2", part: "Qism 1.2", text: "What are the advantages of shopping at a supermarket?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m3_1.2.3", part: "Qism 1.2", text: "Why do some people prefer shopping at an open-air market?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m3_2.1", part: "Qism 2", text: "Describe a failure / a time when you tried but failed.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What were you trying to do?",
        "Why did you fail?",
        "How did you feel about it?",
        "And explain what you learned from this experience.",
      ],
    },
    {
      id: "m3_3.1", part: "Qism 3", text: "Tourism in historic places / cities should be limited.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Tourism in historic places / cities should be limited.",
        for: [
          "Protects cultural heritage from damage",
          "Reduces overcrowding/noise",
          "Preserves sites for future generations",
        ],
        against: [
          "Brings money/jobs to local economy",
          "Educates people about history",
          "Encourages cultural exchange",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 4
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_4: MockTestSet = {
  id: "mock_4",
  title: "Mock Test 4",
  description: "Uy hayvoni, do'st, onlayn o'qish va sinf",
  questions: [
    { id: "m4_1.1.1", part: "Qism 1.1", text: "Do you have any pets at home?", timeLimit: 30 },
    { id: "m4_1.1.2", part: "Qism 1.1", text: "Describe your best / close friend.", timeLimit: 30 },
    { id: "m4_1.1.3", part: "Qism 1.1", text: "What is your typical day like? Can you describe your daily routine?", timeLimit: 30 },
    {
      id: "m4_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m4_1.2.2", part: "Qism 1.2", text: "What are the advantages of online learning?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m4_1.2.3", part: "Qism 1.2", text: "Why do some students prefer studying in a classroom?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m4_2.1", part: "Qism 2", text: "Describe a success / achievement in your life.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What is the success?",
        "How did you achieve it?",
        "How did it affect your life?",
        "And explain why it is important to you.",
      ],
    },
    {
      id: "m4_3.1", part: "Qism 3", text: "Zoos should be banned / Animals should not be kept in zoos.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Zoos should be banned / Animals should not be kept in zoos.",
        for: [
          "Animals suffer in captivity/stress",
          "They should live freely in nature",
          "Supports animal rights/welfare",
        ],
        against: [
          "Educates people about wildlife",
          "Protects endangered species (breeding programs)",
          "Supports conservation/research",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 5
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_5: MockTestSet = {
  id: "mock_5",
  title: "Mock Test 5",
  description: "Fasl, ob-havo, TV va stol o'yinlari",
  questions: [
    { id: "m5_1.1.1", part: "Qism 1.1", text: "What is your favorite season? What weather do you like / dislike?", timeLimit: 30 },
    { id: "m5_1.1.2", part: "Qism 1.1", text: "Tell me about your first teacher.", timeLimit: 30 },
    { id: "m5_1.1.3", part: "Qism 1.1", text: "What do you do on weekends?", timeLimit: 30 },
    {
      id: "m5_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m5_1.2.2", part: "Qism 1.2", text: "What are the advantages of playing board games instead of watching TV?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m5_1.2.3", part: "Qism 1.2", text: "What are the advantages of watching TV over playing games?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m5_2.1", part: "Qism 2", text: "Describe a tradition you grew up with.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What is the tradition?",
        "Is it important?",
        "Why is it important?",
        "And explain how you feel about this tradition.",
      ],
    },
    {
      id: "m5_3.1", part: "Qism 3", text: "Fast food should be heavily taxed / restaurants should display calories.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Fast food should be heavily taxed / restaurants should display calories.",
        for: [
          "Reduces obesity/health problems",
          "Encourages healthier eating",
          "Tax money for public health",
        ],
        against: [
          "Convenient/cheap for busy people",
          "Personal choice/responsibility",
          "Creates jobs/economy",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 6
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_6: MockTestSet = {
  id: "mock_6",
  title: "Mock Test 6",
  description: "Uy ovqati va restoran, kechirim, ijtimoiy tarmoq",
  questions: [
    { id: "m6_1.1.1", part: "Qism 1.1", text: "What is your favorite food? What do you usually eat for breakfast?", timeLimit: 30 },
    { id: "m6_1.1.2", part: "Qism 1.1", text: "Do you like / play any sports? What is your favorite sport?", timeLimit: 30 },
    { id: "m6_1.1.3", part: "Qism 1.1", text: "What do you do in the evenings?", timeLimit: 30 },
    {
      id: "m6_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m6_1.2.2", part: "Qism 1.2", text: "What are the advantages of eating at home?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m6_1.2.3", part: "Qism 1.2", text: "Why do some people prefer eating out?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m6_2.1", part: "Qism 2", text: "Describe a time when you forgave someone.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "Who was the person?",
        "What happened?",
        "How did you forgive them?",
        "And explain how it changed your relationship.",
      ],
    },
    {
      id: "m6_3.1", part: "Qism 3", text: "Social media should be banned / limited for children under 16 / in schools.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Social media should be banned / limited for children under 16 / in schools.",
        for: [
          "Protects mental health/privacy",
          "Reduces addiction/cyberbullying",
          "More time for studies/real life",
        ],
        against: [
          "Helps learning/communication",
          "Modern skill/digital literacy",
          "Freedom of expression",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 7
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_7: MockTestSet = {
  id: "mock_7",
  title: "Mock Test 7",
  description: "Mashina va transport, maslahat, masofaviy ish",
  questions: [
    { id: "m7_1.1.1", part: "Qism 1.1", text: "Describe your room / house / flat. Where do you live?", timeLimit: 30 },
    { id: "m7_1.1.2", part: "Qism 1.1", text: "What is your (favorite) hobby?", timeLimit: 30 },
    { id: "m7_1.1.3", part: "Qism 1.1", text: "Describe your best / close friend.", timeLimit: 30 },
    {
      id: "m7_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m7_1.2.2", part: "Qism 1.2", text: "Why do some people prefer using private cars?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m7_1.2.3", part: "Qism 1.2", text: "Why do others choose public transport?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m7_2.1", part: "Qism 2", text: "Describe a time when you received advice from someone.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "Who gave you the advice?",
        "What was the advice?",
        "How did it help you?",
        "And explain whether advice from others is important in your life.",
      ],
    },
    {
      id: "m7_3.1", part: "Qism 3", text: "Remote work / working from home should be standard.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Remote work / working from home should be standard.",
        for: [
          "Better work-life balance",
          "No commuting/time-saving",
          "Flexible for families",
        ],
        against: [
          "Less team interaction/collaboration",
          "Harder to separate work/home",
          "Not suitable for all jobs",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 8
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_8: MockTestSet = {
  id: "mock_8",
  title: "Mock Test 8",
  description: "Bog'dorchilik, qaror, test va uy vazifasi",
  questions: [
    { id: "m8_1.1.1", part: "Qism 1.1", text: "What do you do in your free time?", timeLimit: 30 },
    { id: "m8_1.1.2", part: "Qism 1.1", text: "Do you have any pets at home?", timeLimit: 30 },
    { id: "m8_1.1.3", part: "Qism 1.1", text: "What is your favorite season? What weather do you like / dislike?", timeLimit: 30 },
    {
      id: "m8_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m8_1.2.2", part: "Qism 1.2", text: "What are the benefits of growing vegetables at home?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m8_1.2.3", part: "Qism 1.2", text: "Why do most people prefer buying from a supermarket?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m8_2.1", part: "Qism 2", text: "Describe a critical / difficult decision you made.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What was the decision?",
        "Why was it difficult?",
        "What did you decide?",
        "And explain how it affected you.",
      ],
    },
    {
      id: "m8_3.1", part: "Qism 3", text: "Standardized tests / homework should be abolished / eliminated in schools.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Standardized tests / homework should be abolished / eliminated in schools.",
        for: [
          "Reduces stress/pressure on students",
          "Allows more creative learning",
          "Focus on real skills",
        ],
        against: [
          "Fair way to measure progress",
          "Prepares for exams/competitions",
          "Maintains discipline",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 9
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_9: MockTestSet = {
  id: "mock_9",
  title: "Mock Test 9",
  description: "Kundalik reja, indoor sport, hobbilar va musiqa",
  questions: [
    { id: "m9_1.1.1", part: "Qism 1.1", text: "What is your typical day like? Can you describe your daily routine?", timeLimit: 30 },
    { id: "m9_1.1.2", part: "Qism 1.1", text: "Tell me about your first teacher.", timeLimit: 30 },
    { id: "m9_1.1.3", part: "Qism 1.1", text: "Describe your hometown / town / neighborhood.", timeLimit: 30 },
    {
      id: "m9_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m9_1.2.2", part: "Qism 1.2", text: "What are the advantages of indoor sports?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m9_1.2.3", part: "Qism 1.2", text: "Do you prefer outdoor sports or indoor sports?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m9_2.1", part: "Qism 2", text: "Describe a goal you set for yourself.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What was the goal?",
        "How did you try to achieve it?",
        "Did you succeed?",
        "And explain why setting goals is important.",
      ],
    },
    {
      id: "m9_3.1", part: "Qism 3", text: "Everyone should have a hobby / learn at least one musical instrument.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Everyone should have a hobby / learn at least one musical instrument.",
        for: [
          "Reduces stress/improves mental health",
          "Develops creativity/skills",
          "Brings joy/social benefits",
        ],
        against: [
          "Not everyone has time/money",
          "Some prefer other activities",
          "Forced hobbies aren't enjoyable",
        ],
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// MOCK TEST 10
// ══════════════════════════════════════════════════════════════
const MOCK_TEST_10: MockTestSet = {
  id: "mock_10",
  title: "Mock Test 10",
  description: "Mashina va velosiped, challange, shahar va transport",
  questions: [
    { id: "m10_1.1.1", part: "Qism 1.1", text: "What do you do on weekends?", timeLimit: 30 },
    { id: "m10_1.1.2", part: "Qism 1.1", text: "What is your (favorite) hobby?", timeLimit: 30 },
    { id: "m10_1.1.3", part: "Qism 1.1", text: "Do you like / play any sports? What is your favorite sport?", timeLimit: 30 },
    {
      id: "m10_1.2.1", part: "Qism 1.2", text: "What can you see in these pictures?", timeLimit: 45,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m10_1.2.2", part: "Qism 1.2", text: "Why do some people prefer using private cars?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m10_1.2.3", part: "Qism 1.2", text: "Why do others choose public transport?", timeLimit: 30,
      imageUrls: [
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800",
      ],
    },
    {
      id: "m10_2.1", part: "Qism 2", text: "Describe a challenge you faced.", timeLimit: 120, prepTime: 60,
      subQuestions: [
        "What was the challenge?",
        "How did you overcome it?",
        "What did you learn?",
      ],
    },
    {
      id: "m10_3.1", part: "Qism 3", text: "Cities should limit private cars / promote cycling.", timeLimit: 120, prepTime: 60,
      part3Data: {
        topic: "Cities should limit private cars / promote cycling.",
        for: [
          "Less pollution/traffic",
          "Healthier lifestyle",
          "Safer streets",
        ],
        against: [
          "Cars more convenient/fast",
          "Cycling not practical in bad weather",
          "Limits personal freedom",
        ],
      },
    },
  ],
};

export const MOCK_TESTS: MockTestSet[] = [
  MOCK_TEST_1,
  MOCK_TEST_2,
  MOCK_TEST_3,
  MOCK_TEST_4,
  MOCK_TEST_5,
  MOCK_TEST_6,
  MOCK_TEST_7,
  MOCK_TEST_8,
  MOCK_TEST_9,
  MOCK_TEST_10,
];
