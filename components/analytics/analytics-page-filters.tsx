"use client";

import { useRouter } from "next13-progressbar";
import { useSearchParams } from "next/navigation";
import { SegmentedControl } from "@mantine/core";

const RANGE_OPTIONS: { label: string; value: string }[] = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

type Props = { currentRange: number };

export function AnalyticsPageFilters({ currentRange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <SegmentedControl
      value={String(currentRange)}
      onChange={setRange}
      data={RANGE_OPTIONS}
      size="sm"
    />
  );
}
