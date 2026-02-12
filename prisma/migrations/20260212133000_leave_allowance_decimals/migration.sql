ALTER TABLE "LeaveAllowance"
  ALTER COLUMN "annualDays" TYPE DOUBLE PRECISION USING "annualDays"::double precision,
  ALTER COLUMN "carryOverDays" TYPE DOUBLE PRECISION USING "carryOverDays"::double precision,
  ALTER COLUMN "adjustedDays" TYPE DOUBLE PRECISION USING "adjustedDays"::double precision,
  ALTER COLUMN "adjustedDays" SET DEFAULT 0;
