/**
 * CentralReach integration tests.
 *
 * Tests the data mappers (session -> card, goal -> care goal, insurance -> coverage),
 * the configuration check, and push-payload schema validation for all data
 * flowing from Aminy to CentralReach.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  mapSessionToCard,
  mapGoalToCareGoal,
  mapInsuranceToCoverage,
} from "@/lib/centralreach-integration";

import type {
  CRSession,
  CRGoal,
  CRInsurance,
} from "@/lib/centralreach-types";

import {
  crBehaviorLogPayloadSchema,
  crRoutineCompletionPayloadSchema,
  crJuniorSessionPayloadSchema,
  crSessionSchema,
  crGoalSchema,
  crInsuranceSchema,
} from "@/lib/schemas/centralreach";

// ---------------------------------------------------------------------------
// Helpers — factory functions for valid CentralReach data
// ---------------------------------------------------------------------------

function validCRSession(): CRSession {
  return {
    id: "sess-001",
    clientId: "client-001",
    providerId: "prov-001",
    date: "2025-03-01",
    startTime: "09:00",
    endTime: "10:30",
    duration: 90,
    sessionType: "direct_therapy",
    notes: "Child demonstrated improved compliance during DTT targets.",
    goals: [
      {
        goalId: "g-1",
        trials: 20,
        successes: 15,
        accuracy: 75,
        promptLevel: "verbal",
        notes: "Progressing well",
        phase: "acquisition",
      },
    ],
    billingCode: "97153",
    billingUnits: 6,
    status: "completed",
    signedOff: true,
    signedOffBy: "Dr. Jones",
    signedOffAt: "2025-03-01T11:00:00Z",
    createdAt: "2025-03-01T09:00:00Z",
    updatedAt: "2025-03-01T11:00:00Z",
  };
}

function validCRGoal(): CRGoal {
  return {
    id: "goal-001",
    clientId: "client-001",
    description: "Increase functional communication requests using AAC device",
    targetBehavior: "manding",
    baseline: 20,
    currentLevel: 55,
    target: 80,
    measurementMethod: "trial_by_trial",
    domain: "communication",
    status: "active",
    targetDate: "2025-12-31",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-02-28T00:00:00Z",
  };
}

function validCRInsurance(): CRInsurance {
  return {
    payerId: "payer-001",
    payerName: "Blue Cross Blue Shield",
    memberId: "MEM-12345",
    groupNumber: "GRP-9876",
    authorizationNumber: "AUTH-5555",
    authUnitsRemaining: 100,
    authUnitsUsed: 50,
    authStartDate: "2025-01-01",
    authEndDate: "2027-12-31",
    authStatus: "active",
  };
}

function validBehaviorLogPayload() {
  return {
    clientId: "client-001",
    reportedBy: "parent-001",
    date: "2025-03-01",
    time: "14:30",
    antecedent: "Child was asked to transition from preferred activity to homework",
    behavior: "Screaming and throwing items on the floor for 3 minutes",
    consequence: "Staff redirected child to the calm-down area and provided deep pressure",
    severity: 3,
    location: "Classroom",
  };
}

function validRoutineCompletionPayload() {
  return {
    clientId: "client-001",
    reportedBy: "parent-001",
    date: "2025-03-01",
    routineType: "morning" as const,
    routineName: "Morning Routine",
    stepsCompleted: 8,
    stepsTotal: 10,
    completionPercentage: 80,
    independenceLevel: "verbal" as const,
    duration: 25,
    billingDocumentation: {
      isHomeProgramActivity: true,
      linkedHomeProgramId: "hp-001",
      linkedGoalIds: ["g-1", "g-2"],
      parentTrainingMinutes: 10,
    },
  };
}

function validJuniorSessionPayload() {
  return {
    clientId: "client-001",
    reportedBy: "parent-001",
    date: "2025-03-01",
    sessionDuration: 15,
    gameType: "emotion-match",
    skillDomain: "social_skills" as const,
    trialsCompleted: 20,
    trialsCorrect: 16,
    accuracy: 80,
    engagementScore: 90,
    linkedGoalIds: ["g-1"],
    rewards: {
      starsEarned: 5,
      badgesEarned: ["emotion-master"],
    },
    adaptiveDifficulty: {
      startLevel: 2,
      endLevel: 3,
      adjustments: 1,
    },
  };
}

// ============================================================================
// mapSessionToCard
// ============================================================================

describe("mapSessionToCard", () => {
  it("maps a valid session to an AminySessionCard", () => {
    const session = validCRSession();
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.id).toBe("sess-001");
    expect(card.childName).toBe("Alex");
    expect(card.providerName).toBe("Dr. Jones");
    expect(card.source).toBe("centralreach");
  });

  it("formats duration correctly for hours and minutes", () => {
    const session = validCRSession(); // 90 min
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.duration).toBe("1h 30m");
  });

  it("formats duration for minutes-only sessions", () => {
    const session = { ...validCRSession(), duration: 45 };
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.duration).toBe("45m");
  });

  it("translates sessionType to human-readable label", () => {
    const session = validCRSession();
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.type).toBe("Direct Therapy (RBT)");
  });

  it("truncates long notes to 200 chars with ellipsis", () => {
    const longNotes = "A".repeat(250);
    const session = { ...validCRSession(), notes: longNotes };
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.summary.length).toBe(200);
    expect(card.summary.endsWith("...")).toBe(true);
  });

  it("preserves short notes without truncation", () => {
    const session = validCRSession();
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.summary).toBe(session.notes);
  });

  it("maps goal progress with accuracy-based trends", () => {
    const session = validCRSession();
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.goalProgress).toHaveLength(1);
    expect(card.goalProgress[0].accuracy).toBe(75);
    // 75 >= 50 so trend should be 'stable'
    expect(card.goalProgress[0].trend).toBe("stable");
  });

  it("assigns 'improving' trend for accuracy >= 80", () => {
    const session = {
      ...validCRSession(),
      goals: [
        { ...validCRSession().goals[0], accuracy: 85 },
      ],
    };
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.goalProgress[0].trend).toBe("improving");
  });

  it("assigns 'declining' trend for accuracy < 50", () => {
    const session = {
      ...validCRSession(),
      goals: [
        { ...validCRSession().goals[0], accuracy: 30 },
      ],
    };
    const card = mapSessionToCard(session, "Alex", "Dr. Jones");
    expect(card.goalProgress[0].trend).toBe("declining");
  });
});

// ============================================================================
// mapGoalToCareGoal
// ============================================================================

describe("mapGoalToCareGoal", () => {
  it("maps a valid goal to an AminyCareGoal", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.id).toBe("goal-001");
    expect(careGoal.source).toBe("centralreach");
  });

  it("uses targetBehavior as the title", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.title).toBe("manding");
  });

  it("maps currentLevel to progress", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.progress).toBe(55);
  });

  it("maps target field correctly", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.target).toBe(80);
  });

  it("translates domain to human-readable label", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.domain).toBe("Communication");
  });

  it("maps status directly", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.status).toBe("active");
  });

  it("maps updatedAt to lastUpdated", () => {
    const goal = validCRGoal();
    const careGoal = mapGoalToCareGoal(goal);
    expect(careGoal.lastUpdated).toBe("2025-02-28T00:00:00Z");
  });
});

// ============================================================================
// mapInsuranceToCoverage
// ============================================================================

describe("mapInsuranceToCoverage", () => {
  it("maps valid insurance to AminyCoverageInfo", () => {
    const ins = validCRInsurance();
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.payerName).toBe("Blue Cross Blue Shield");
    expect(cov.source).toBe("centralreach");
  });

  it("maps memberId correctly", () => {
    const ins = validCRInsurance();
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.memberId).toBe("MEM-12345");
  });

  it("maps auth units", () => {
    const ins = validCRInsurance();
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.unitsRemaining).toBe(100);
    expect(cov.unitsUsed).toBe(50);
  });

  it("returns 'active' status for active insurance with many days remaining", () => {
    const ins = validCRInsurance();
    const cov = mapInsuranceToCoverage(ins);
    // authEndDate is 2025-12-31, far in the future relative to most test runs
    expect(cov.status).toBe("active");
  });

  it("returns 'expired' for past authEndDate", () => {
    const ins = { ...validCRInsurance(), authEndDate: "2020-01-01" };
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.status).toBe("expired");
  });

  it("returns 'expired' when authStatus is expired", () => {
    const ins = {
      ...validCRInsurance(),
      authStatus: "expired" as const,
      authEndDate: "2020-01-01",
    };
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.status).toBe("expired");
  });

  it("returns 'expiring_soon' when units remaining <= 10", () => {
    const ins = { ...validCRInsurance(), authUnitsRemaining: 5 };
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.status).toBe("expiring_soon");
  });

  it("returns 'pending' when authStatus is pending", () => {
    const ins = { ...validCRInsurance(), authStatus: "pending" as const };
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.status).toBe("pending");
  });

  it("maps authExpiresOn from authEndDate", () => {
    const ins = validCRInsurance();
    const cov = mapInsuranceToCoverage(ins);
    expect(cov.authExpiresOn).toBe("2027-12-31");
  });
});

// ============================================================================
// isCentralReachConfigured — cannot test directly since it reads import.meta.env
// and an internal singleton, but we verify the function is exported
// ============================================================================

describe("isCentralReachConfigured", () => {
  it("is exported as a function", async () => {
    const mod = await import("@/lib/centralreach-integration");
    expect(typeof mod.isCentralReachConfigured).toBe("function");
  });
});

// ============================================================================
// Push Payload Schema Validation
// ============================================================================

describe("crBehaviorLogPayloadSchema", () => {
  it("accepts a valid behavior log payload", () => {
    expect(
      crBehaviorLogPayloadSchema.safeParse(validBehaviorLogPayload()).success,
    ).toBe(true);
  });

  it("rejects missing clientId", () => {
    const { clientId, ...rest } = validBehaviorLogPayload();
    expect(crBehaviorLogPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const data = { ...validBehaviorLogPayload(), time: "2:30 PM" };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects severity 0 (below min)", () => {
    const data = { ...validBehaviorLogPayload(), severity: 0 };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects severity 6 (above max)", () => {
    const data = { ...validBehaviorLogPayload(), severity: 6 };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects antecedent shorter than 10 chars", () => {
    const data = { ...validBehaviorLogPayload(), antecedent: "short" };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("allows optional notes", () => {
    const data = { ...validBehaviorLogPayload(), notes: undefined };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(true);
  });

  it("allows optional environmentalFactors", () => {
    const data = {
      ...validBehaviorLogPayload(),
      environmentalFactors: undefined,
    };
    expect(crBehaviorLogPayloadSchema.safeParse(data).success).toBe(true);
  });
});

describe("crRoutineCompletionPayloadSchema", () => {
  it("accepts a valid routine completion payload", () => {
    expect(
      crRoutineCompletionPayloadSchema.safeParse(
        validRoutineCompletionPayload(),
      ).success,
    ).toBe(true);
  });

  it("rejects invalid routineType", () => {
    const data = {
      ...validRoutineCompletionPayload(),
      routineType: "midnight" as any,
    };
    expect(crRoutineCompletionPayloadSchema.safeParse(data).success).toBe(
      false,
    );
  });

  it("rejects completionPercentage above 100", () => {
    const data = {
      ...validRoutineCompletionPayload(),
      completionPercentage: 150,
    };
    expect(crRoutineCompletionPayloadSchema.safeParse(data).success).toBe(
      false,
    );
  });

  it("rejects missing billingDocumentation", () => {
    const { billingDocumentation, ...rest } = validRoutineCompletionPayload();
    expect(crRoutineCompletionPayloadSchema.safeParse(rest).success).toBe(
      false,
    );
  });

  it("rejects empty routineName", () => {
    const data = { ...validRoutineCompletionPayload(), routineName: "" };
    expect(crRoutineCompletionPayloadSchema.safeParse(data).success).toBe(
      false,
    );
  });

  it("rejects invalid independenceLevel", () => {
    const data = {
      ...validRoutineCompletionPayload(),
      independenceLevel: "magic" as any,
    };
    expect(crRoutineCompletionPayloadSchema.safeParse(data).success).toBe(
      false,
    );
  });
});

describe("crJuniorSessionPayloadSchema", () => {
  it("accepts a valid junior session payload", () => {
    expect(
      crJuniorSessionPayloadSchema.safeParse(validJuniorSessionPayload())
        .success,
    ).toBe(true);
  });

  it("rejects sessionDuration < 1", () => {
    const data = { ...validJuniorSessionPayload(), sessionDuration: 0 };
    expect(crJuniorSessionPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid skillDomain", () => {
    const data = {
      ...validJuniorSessionPayload(),
      skillDomain: "telepathy" as any,
    };
    expect(crJuniorSessionPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects accuracy above 100", () => {
    const data = { ...validJuniorSessionPayload(), accuracy: 101 };
    expect(crJuniorSessionPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects engagementScore below 0", () => {
    const data = { ...validJuniorSessionPayload(), engagementScore: -5 };
    expect(crJuniorSessionPayloadSchema.safeParse(data).success).toBe(false);
  });

  it("rejects missing rewards object", () => {
    const { rewards, ...rest } = validJuniorSessionPayload();
    expect(crJuniorSessionPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing adaptiveDifficulty object", () => {
    const { adaptiveDifficulty, ...rest } = validJuniorSessionPayload();
    expect(crJuniorSessionPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty gameType", () => {
    const data = { ...validJuniorSessionPayload(), gameType: "" };
    expect(crJuniorSessionPayloadSchema.safeParse(data).success).toBe(false);
  });
});

// ============================================================================
// CentralReach pull schema validation (session, goal, insurance)
// ============================================================================

describe("crSessionSchema (pull validation)", () => {
  it("accepts a valid CR session object", () => {
    expect(crSessionSchema.safeParse(validCRSession()).success).toBe(true);
  });

  it("rejects invalid sessionType", () => {
    const data = { ...validCRSession(), sessionType: "yoga" as any };
    expect(crSessionSchema.safeParse(data).success).toBe(false);
  });

  it("rejects duration > 480", () => {
    const data = { ...validCRSession(), duration: 500 };
    expect(crSessionSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const data = { ...validCRSession(), startTime: "9:00 AM" };
    expect(crSessionSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid billing code", () => {
    const data = { ...validCRSession(), billingCode: "abc" };
    expect(crSessionSchema.safeParse(data).success).toBe(false);
  });
});

describe("crGoalSchema (pull validation)", () => {
  it("accepts a valid CR goal object", () => {
    expect(crGoalSchema.safeParse(validCRGoal()).success).toBe(true);
  });

  it("rejects baseline above 100", () => {
    const data = { ...validCRGoal(), baseline: 150 };
    expect(crGoalSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid domain", () => {
    const data = { ...validCRGoal(), domain: "telekinesis" as any };
    expect(crGoalSchema.safeParse(data).success).toBe(false);
  });

  it("rejects short description", () => {
    const data = { ...validCRGoal(), description: "Short" };
    expect(crGoalSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid status", () => {
    const data = { ...validCRGoal(), status: "paused" as any };
    expect(crGoalSchema.safeParse(data).success).toBe(false);
  });
});

describe("crInsuranceSchema (pull validation)", () => {
  it("accepts a valid CR insurance object", () => {
    expect(crInsuranceSchema.safeParse(validCRInsurance()).success).toBe(true);
  });

  it("rejects missing payerId", () => {
    const data = { ...validCRInsurance(), payerId: "" };
    expect(crInsuranceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects negative authUnitsRemaining", () => {
    const data = { ...validCRInsurance(), authUnitsRemaining: -1 };
    expect(crInsuranceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid authStatus", () => {
    const data = { ...validCRInsurance(), authStatus: "cancelled" as any };
    expect(crInsuranceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid date format for authStartDate", () => {
    const data = { ...validCRInsurance(), authStartDate: "01/01/2025" };
    expect(crInsuranceSchema.safeParse(data).success).toBe(false);
  });
});
