import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use the same timezone as the server runtime
process.env.TZ = process.env.TZ || "Asia/Kolkata";

const prisma = new PrismaClient();

// Helper: generate a date string relative to today (e.g., -13 = 13 days ago)
function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// Helper: build a unique timestamp for seed data in LOCAL timezone.
//   baseHour  – starting hour (local) for the digester (e.g. 7, 8, 9)
//   idx       – loop index; drives minutes + seconds so every record is unique
//   No trailing 'Z' → parsed as LOCAL time by Node.js (respects TZ env var)
function makeTimestamp(dateStr: string, baseHour: number, idx: number): Date {
    const hh = String(baseHour).padStart(2, "0");
    const mm = String((idx * 7 + 3)  % 60).padStart(2, "0");  // 3,10,17,24... (mod 60)
    const ss = String((idx * 13 + 7) % 60).padStart(2, "0");  // 7,20,33,46... (mod 60)
    return new Date(`${dateStr}T${hh}:${mm}:${ss}`);
}

async function main() {
    console.log("🌱 Seeding database...");

    // ── Digesters ────────────────────────────────────────────────────────────
    const digesters = await Promise.all([
        prisma.digester.upsert({
            where: { id: "DG-001" },
            update: {},
            create: {
                id: "DG-001",
                location: "Sector 4, Rampur Village",
                installedDate: new Date("2024-10-15"),
                status: "active",
            },
        }),
        prisma.digester.upsert({
            where: { id: "DG-002" },
            update: {},
            create: {
                id: "DG-002",
                location: "Block B, Kisan Colony",
                installedDate: new Date("2024-10-15"),
                status: "active",
            },
        }),
        prisma.digester.upsert({
            where: { id: "DG-003" },
            update: {},
            create: {
                id: "DG-003",
                location: "Ward 7, Mahila Nagar",
                installedDate: new Date("2024-10-20"),
                status: "active",
            },
        }),
    ]);
    console.log(`✅ ${digesters.length} digesters`);

    // ── Admin User ───────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("admin123", 12);
    await prisma.user.upsert({
        where: { id: "ADMIN" },
        update: {},
        create: {
            id: "ADMIN",
            name: "Program Admin",
            phone: "0000000000",
            passwordHash: adminHash,
            role: "admin",
            status: "active",
            digesterId: null,
        },
    });
    console.log("✅ Admin user");

    // ── Operator Users ────────────────────────────────────────────────────────
    const operators = [
        { id: "OP001", name: "Rajan Kumar",  phone: "9876543210", password: "pass123", digesterId: "DG-001" },
        { id: "OP002", name: "Priya Sharma", phone: "9876500211", password: "pass456", digesterId: "DG-002" },
        { id: "OP003", name: "Dilip Yadav",  phone: "9876577712", password: "pass789", digesterId: "DG-003" },
    ];
    for (const op of operators) {
        const hash = await bcrypt.hash(op.password, 12);
        await prisma.user.upsert({
            where: { id: op.id },
            update: {},
            create: { id: op.id, name: op.name, phone: op.phone, passwordHash: hash, role: "operator", status: "active", digesterId: op.digesterId },
        });
    }
    console.log(`✅ ${operators.length} operators`);

    // ── Households ────────────────────────────────────────────────────────────
    const households = [
        { id: "HH-001", digesterId: "DG-001", headName: "Suresh Patel",  phone: "9900112233", address: "House 12, Lane 3", members: 4, fuelReplaced: ["LPG (Cooking Gas)"] },
        { id: "HH-002", digesterId: "DG-001", headName: "Meena Devi",    phone: "9900112234", address: "House 5, Lane 1",  members: 3, fuelReplaced: ["Firewood"] },
        { id: "HH-003", digesterId: "DG-001", headName: "Amol Wagh",     phone: "9900112235", address: "House 18, Lane 5", members: 5, fuelReplaced: ["LPG (Cooking Gas)", "Firewood"] },
        { id: "HH-004", digesterId: "DG-002", headName: "Lakshmi Bai",   phone: "9900112236", address: "Plot 3, Sector B", members: 4, fuelReplaced: ["Firewood"] },
        { id: "HH-005", digesterId: "DG-002", headName: "Ramesh Singh",  phone: "9900112237", address: "Plot 9, Sector A", members: 6, fuelReplaced: ["Kerosene"] },
        { id: "HH-006", digesterId: "DG-003", headName: "Anita Kumari",  phone: "9900112238", address: "Lane 2, Block C",  members: 3, fuelReplaced: ["Firewood"] },
        { id: "HH-007", digesterId: "DG-001", headName: "Vijay Tiwari",  phone: "9900112239", address: "House 3, Lane 2",  members: 5, fuelReplaced: ["LPG (Cooking Gas)"] },
        { id: "HH-008", digesterId: "DG-002", headName: "Sunita Verma",  phone: "9900112240", address: "Plot 6, Sector C", members: 2, fuelReplaced: ["Firewood", "Kerosene"] },
        { id: "HH-009", digesterId: "DG-003", headName: "Deepak Gupta",  phone: "9900112241", address: "Lane 7, Block A",  members: 4, fuelReplaced: ["LPG (Cooking Gas)"] },
    ];
    for (const hh of households) {
        await prisma.household.upsert({ where: { id: hh.id }, update: {}, create: hh });
    }
    console.log(`✅ ${households.length} households`);

    // ── Feedstock Logs ────────────────────────────────────────────────────────
    // Delete and re-create so we get fresh deterministic data
    await prisma.feedstockLog.deleteMany({ where: { operatorId: { in: ["OP001", "OP002", "OP003"] } } });

    const feedstockData = [
        // DG-001 / OP001
        { date: daysAgo(13), weight: 120, waterLitres: 60,  type: "Cow Dung",        notes: "Morning batch",        digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(12), weight: 135, waterLitres: 70,  type: "Cow Dung",        notes: null,                   digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(10), weight: 110, waterLitres: 55,  type: "Mixed Organic",   notes: "Veg waste added",      digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(8),  weight: 150, waterLitres: 75,  type: "Cow Dung",        notes: null,                   digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(6),  weight: 125, waterLitres: 65,  type: "Kitchen Waste",   notes: "Hotel waste included", digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(4),  weight: 140, waterLitres: 70,  type: "Cow Dung",        notes: null,                   digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(2),  weight: 130, waterLitres: 65,  type: "Mixed Organic",   notes: "Crop residue",         digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(0),  weight: 115, waterLitres: 58,  type: "Cow Dung",        notes: null,                   digesterId: "DG-001", operatorId: "OP001" },
        // DG-002 / OP002
        { date: daysAgo(13), weight: 200, waterLitres: 100, type: "Cow Dung",        notes: null,                   digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(11), weight: 180, waterLitres: 90,  type: "Mixed Organic",   notes: "Market waste",         digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(9),  weight: 220, waterLitres: 110, type: "Cow Dung",        notes: null,                   digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(7),  weight: 195, waterLitres: 98,  type: "Kitchen Waste",   notes: "School canteen",       digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(5),  weight: 210, waterLitres: 105, type: "Cow Dung",        notes: null,                   digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(3),  weight: 175, waterLitres: 88,  type: "Mixed Organic",   notes: null,                   digesterId: "DG-002", operatorId: "OP002" },
        // DG-003 / OP003
        { date: daysAgo(12), weight: 90,  waterLitres: 45,  type: "Cow Dung",        notes: "Small batch",          digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(9),  weight: 100, waterLitres: 50,  type: "Kitchen Waste",   notes: null,                   digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(6),  weight: 85,  waterLitres: 42,  type: "Cow Dung",        notes: null,                   digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(3),  weight: 95,  waterLitres: 48,  type: "Mixed Organic",   notes: "Green waste added",    digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(1),  weight: 105, waterLitres: 53,  type: "Cow Dung",        notes: null,                   digesterId: "DG-003", operatorId: "OP003" },
    ];

    await prisma.feedstockLog.createMany({
        data: feedstockData.map((r, i) => ({
            date: makeTimestamp(r.date, 6, i),
            weight: r.weight,
            waterLitres: r.waterLitres,
            type: r.type,
            photoUrl: "",
            notes: r.notes,
            digesterId: r.digesterId,
            operatorId: r.operatorId,
        })),
    });
    console.log(`✅ ${feedstockData.length} feedstock logs`);

    // ── Flow Meter Readings ───────────────────────────────────────────────────
    // Full wipe so we get a clean slate for offline testing
    await prisma.flowMeterReading.deleteMany({});

    // Daily increments (cycled) for each digester — realistic biogas production
    const meterIncrements: Record<string, number[]> = {
        "DG-001": [5.5, 6.2, 4.8, 7.1, 5.9, 6.8, 4.5, 7.5, 6.0, 5.3], // avg ~6.0 m³/day
        "DG-002": [8.5, 9.2, 7.5, 10.5, 8.8, 9.8, 7.2, 11.0, 9.0, 8.0], // avg ~9.0 m³/day
        "DG-003": [3.5, 4.0, 3.2, 5.0, 3.8, 4.5, 3.0, 5.5, 4.1, 3.7],   // avg ~4.0 m³/day
    };

    const meterConfig = [
        { digesterId: "DG-001", operatorId: "OP001", startReading: 800.0 },
        { digesterId: "DG-002", operatorId: "OP002", startReading: 1200.0 },
        { digesterId: "DG-003", operatorId: "OP003", startReading: 400.0 },
    ];

    const allMeterReadings: Array<{
        date: Date; reading: number; photoUrl: string;
        notes: string | null; digesterId: string; operatorId: string;
    }> = [];

    for (const cfg of meterConfig) {
        const incr = meterIncrements[cfg.digesterId];
        let cumulative = cfg.startReading;
        // baseHour varies per digester so readings on the same calendar day
        // (across digesters) have different timestamps and sort deterministically
        const baseHour = cfg.digesterId === "DG-001" ? 7
                       : cfg.digesterId === "DG-002" ? 8
                       : 9;
        let idx = 0;

        // Baseline 30 days ago
        allMeterReadings.push({
            date: makeTimestamp(daysAgo(30), baseHour, idx++),
            reading: cumulative,
            photoUrl: "",
            notes: "Baseline reading",
            digesterId: cfg.digesterId,
            operatorId: cfg.operatorId,
        });

        // One reading per day: from 29 days ago → yesterday (daysAgo(1))
        // Today (daysAgo(0)) is intentionally left empty so operators can log it fresh
        for (let d = 29; d >= 1; d--) {
            const inc = incr[(29 - d) % incr.length];
            cumulative = +(cumulative + inc).toFixed(2);
            allMeterReadings.push({
                date: makeTimestamp(daysAgo(d), baseHour, idx++),
                reading: cumulative,
                photoUrl: "",
                notes: null,
                digesterId: cfg.digesterId,
                operatorId: cfg.operatorId,
            });
        }
    }

    await prisma.flowMeterReading.createMany({ data: allMeterReadings });
    console.log(`✅ ${allMeterReadings.length} meter readings (daily, up to yesterday)`);
    console.log(`   DG-001 last reading: ${allMeterReadings.filter(r => r.digesterId === "DG-001").at(-1)?.reading} m³`);
    console.log(`   DG-002 last reading: ${allMeterReadings.filter(r => r.digesterId === "DG-002").at(-1)?.reading} m³`);
    console.log(`   DG-003 last reading: ${allMeterReadings.filter(r => r.digesterId === "DG-003").at(-1)?.reading} m³`);

    // ── Gas Distributions ─────────────────────────────────────────────────────
    await prisma.gasDistribution.deleteMany({ where: { operatorId: { in: ["OP001", "OP002", "OP003"] } } });

    const distributionData = [
        // DG-001 distributions
        { date: daysAgo(13), householdId: "HH-001", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(13), householdId: "HH-002", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(13), householdId: "HH-003", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(13), householdId: "HH-007", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(6),  householdId: "HH-001", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(6),  householdId: "HH-002", volume: 1.2, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(6),  householdId: "HH-003", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(6),  householdId: "HH-007", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(0),  householdId: "HH-001", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(0),  householdId: "HH-002", volume: 1.5, digesterId: "DG-001", operatorId: "OP001" },
        { date: daysAgo(0),  householdId: "HH-003", volume: 2.0, digesterId: "DG-001", operatorId: "OP001" },
        // DG-002 distributions
        { date: daysAgo(13), householdId: "HH-004", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(13), householdId: "HH-005", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(13), householdId: "HH-008", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(6),  householdId: "HH-004", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(6),  householdId: "HH-005", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(6),  householdId: "HH-008", volume: 1.0, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(0),  householdId: "HH-004", volume: 1.5, digesterId: "DG-002", operatorId: "OP002" },
        { date: daysAgo(0),  householdId: "HH-005", volume: 2.0, digesterId: "DG-002", operatorId: "OP002" },
        // DG-003 distributions
        { date: daysAgo(9),  householdId: "HH-006", volume: 1.5, digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(9),  householdId: "HH-009", volume: 1.5, digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(2),  householdId: "HH-006", volume: 1.5, digesterId: "DG-003", operatorId: "OP003" },
        { date: daysAgo(2),  householdId: "HH-009", volume: 1.5, digesterId: "DG-003", operatorId: "OP003" },
    ];

    await prisma.gasDistribution.createMany({
        data: distributionData.map((r, i) => ({
            date: makeTimestamp(r.date, 8, i),
            volume: r.volume,
            householdId: r.householdId,
            digesterId: r.digesterId,
            operatorId: r.operatorId,
        })),
    });
    console.log(`✅ ${distributionData.length} gas distributions`);

    // ── Compost Logs ─────────────────────────────────────────────────────────
    await prisma.compostLog.deleteMany({ where: { operatorId: { in: ["OP001", "OP002", "OP003"] } } });

    const compostData = [
        // DG-001
        { date: daysAgo(27), bags: 8,  digesterId: "DG-001", operatorId: "OP001", notes: "Good quality slurry" },
        { date: daysAgo(13), bags: 10, digesterId: "DG-001", operatorId: "OP001", notes: null },
        { date: daysAgo(6),  bags: 9,  digesterId: "DG-001", operatorId: "OP001", notes: "Distributed to 3 farmers" },
        { date: daysAgo(0),  bags: 11, digesterId: "DG-001", operatorId: "OP001", notes: null },
        // DG-002
        { date: daysAgo(22), bags: 14, digesterId: "DG-002", operatorId: "OP002", notes: null },
        { date: daysAgo(10), bags: 16, digesterId: "DG-002", operatorId: "OP002", notes: "Large batch" },
        { date: daysAgo(3),  bags: 13, digesterId: "DG-002", operatorId: "OP002", notes: null },
        { date: daysAgo(0),  bags: 15, digesterId: "DG-002", operatorId: "OP002", notes: "Sold to market" },
        // DG-003
        { date: daysAgo(14), bags: 5,  digesterId: "DG-003", operatorId: "OP003", notes: null },
        { date: daysAgo(7),  bags: 6,  digesterId: "DG-003", operatorId: "OP003", notes: "Composting improving" },
        { date: daysAgo(0),  bags: 7,  digesterId: "DG-003", operatorId: "OP003", notes: null },
    ];

    await prisma.compostLog.createMany({
        data: compostData.map((r, i) => ({
            date: makeTimestamp(r.date, 9, i),
            bags: r.bags,
            photoUrl: "",
            notes: r.notes,
            digesterId: r.digesterId,
            operatorId: r.operatorId,
        })),
    });
    console.log(`✅ ${compostData.length} compost logs`);

    console.log("\n🎉 Seeding complete!");
    console.log("\nLogin credentials:");
    console.log("  Admin : phone=0000000000  password=admin123");
    console.log("  OP001 : phone=9876543210  password=pass123  (DG-001)");
    console.log("  OP002 : phone=9876500211  password=pass456  (DG-002)");
    console.log("  OP003 : phone=9876577712  password=pass789  (DG-003)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
