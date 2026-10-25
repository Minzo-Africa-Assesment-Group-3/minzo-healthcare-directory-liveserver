import { describe, expect, it } from "vitest";

import { registerBusinessBodySchema } from "./register-business.contract.js";

function validRegistrationBody() {
  return {
    user: {
      email: "owner@example.com",
      password: "a-production-password",
      displayName: "Ama Owner"
    },
    business: {
      displayName: "Minzo Healthcare",
      legalName: "Minzo Healthcare Limited",
      membershipRole: "OWNER" as const
    },
    primaryLocation: {
      name: "Minzo Medical Centre - Accra",
      facilityType: "Clinic",
      timezone: "Africa/Monrovia",
      location: {
        addressLine: "14 Independence Avenue",
        county: "Greater Accra",
        cityOrTown: "Monrovia",
        latitude: 5.6037,
        longitude: -0.187
      },
      services: ["General Practice", "Pharmacy"],
      openingHours: [
        {
          dayOfWeek: "MONDAY" as const,
          periods: [{ opensAt: "08:00", closesAt: "17:00" }]
        },
        {
          dayOfWeek: "SUNDAY" as const,
          is24Hours: true
        }
      ],
      staffMembers: [
        {
          displayName: "Dr. Efua Mensah",
          profession: "GENERAL_PRACTITIONER" as const,
          professionalTitle: "Medical Officer",
          email: "efua.mensah@example.com",
          yearsExperience: 12
        }
      ]
    }
  };
}

describe("business registration contract", () => {
  it("accepts a facility with services, staff, and coordinates", () => {
    const result = registerBusinessBodySchema.safeParse(validRegistrationBody());

    expect(result.success).toBe(true);
  });

  it("does not accept client-controlled registration-document metadata", () => {
    const body = validRegistrationBody();
    const result = registerBusinessBodySchema.safeParse({
      ...body,
      business: {
        ...body.business,
        registrationDocument: {
          objectKey: "client-controlled/path.pdf",
          originalFileName: "registration.pdf",
          mimeType: "application/pdf",
          sizeBytes: 25_000
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("requires latitude and longitude to be supplied together", () => {
    const body = validRegistrationBody();
    const incompleteLocation = {
      addressLine: body.primaryLocation.location.addressLine,
      county: body.primaryLocation.location.county,
      cityOrTown: body.primaryLocation.location.cityOrTown,
      latitude: body.primaryLocation.location.latitude
    };

    const result = registerBusinessBodySchema.safeParse({
      ...body,
      primaryLocation: {
        ...body.primaryLocation,
        location: incompleteLocation
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts a location without coordinates", () => {
    const body = validRegistrationBody();
    const result = registerBusinessBodySchema.safeParse({
      ...body,
      primaryLocation: {
        ...body.primaryLocation,
        location: {
          addressLine: body.primaryLocation.location.addressLine,
          county: body.primaryLocation.location.county,
          cityOrTown: body.primaryLocation.location.cityOrTown
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate service names regardless of casing", () => {
    const body = validRegistrationBody();
    const result = registerBusinessBodySchema.safeParse({
      ...body,
      primaryLocation: {
        ...body.primaryLocation,
        services: ["Pharmacy", "pharmacy"]
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate opening-hour days", () => {
    const body = validRegistrationBody();
    const monday = body.primaryLocation.openingHours[0];
    const result = registerBusinessBodySchema.safeParse({
      ...body,
      primaryLocation: {
        ...body.primaryLocation,
        openingHours: [monday, monday]
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects overlapping opening periods", () => {
    const body = validRegistrationBody();
    const result = registerBusinessBodySchema.safeParse({
      ...body,
      primaryLocation: {
        ...body.primaryLocation,
        openingHours: [
          {
            dayOfWeek: "MONDAY",
            periods: [
              { opensAt: "08:00", closesAt: "12:00" },
              { opensAt: "11:00", closesAt: "17:00" }
            ]
          }
        ]
      }
    });

    expect(result.success).toBe(false);
  });
});
