"use client";

import { Modal, Button, Stack, Text } from "@mantine/core";

export type UnitConflictExisting = {
  id: string;
  quantity: number;
  unit: string;
  lowThreshold: number;
  groceryItemName: string;
};

export type UnitConflictIncoming = {
  quantity: number;
  unit: string;
  lowThreshold: number;
};

export type UnitConflictResolution =
  | "addInExistingUnit"
  | "switchToNewUnit"
  | "addAsSeparate";

type Props = {
  opened: boolean;
  onClose: () => void;
  existing: UnitConflictExisting;
  incoming: UnitConflictIncoming;
  onResolve: (resolution: UnitConflictResolution) => void;
  loading?: boolean;
  error?: string;
};

export function AddGroceryUnitConflictModal({
  opened,
  onClose,
  existing,
  incoming,
  onResolve,
  loading = false,
  error,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Unit conflict"
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          You already have {existing.groceryItemName} ({existing.quantity}{" "}
          {existing.unit}). You're adding {incoming.quantity} {incoming.unit}.
          How do you want to update?
        </Text>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Stack gap="xs">
          <Button
            variant="light"
            fullWidth
            onClick={() => onResolve("addInExistingUnit")}
            disabled={loading}
          >
            Add to existing (keep {existing.unit})
          </Button>
          <Button
            variant="light"
            fullWidth
            onClick={() => onResolve("switchToNewUnit")}
            disabled={loading}
          >
            Switch to {incoming.unit}
          </Button>
          <Button
            variant="default"
            fullWidth
            onClick={() => onResolve("addAsSeparate")}
            disabled={loading}
          >
            Add as separate entry
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
