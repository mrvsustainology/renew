"use client";

import useSWR from "swr";
import {
    reportsApi,
    digestersApi,
    operatorsApi,
    householdsApi,
    type OverviewData,
    type ChartsData,
    type Digester,
    type Operator,
} from "@/lib/api/admin.api";

const SWR_OPTIONS = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000, // dedupe requests within 30s
};

// ── Overview + Charts (dashboard) ────────────────────────────
export function useOverview() {
    return useSWR<OverviewData>("overview", () => reportsApi.getOverview(), SWR_OPTIONS);
}

export function useCharts() {
    return useSWR<ChartsData>("charts", () => reportsApi.getCharts(), SWR_OPTIONS);
}

// ── Entities ─────────────────────────────────────────────────
export function useDigesters() {
    return useSWR<Digester[]>("digesters", () => digestersApi.getAll(), SWR_OPTIONS);
}

export function useOperators() {
    return useSWR<Operator[]>("operators", () => operatorsApi.getAll(), SWR_OPTIONS);
}

export function useHouseholds() {
    return useSWR<any[]>("households", () => householdsApi.getAll(), SWR_OPTIONS);
}

// ── Table data ───────────────────────────────────────────────
export function useTableData(module: string) {
    return useSWR<any[]>(`table-${module}`, () => reportsApi.getTableData(module), SWR_OPTIONS);
}
