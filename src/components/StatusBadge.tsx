import { Badge } from "@/components/ui/badge";
import type { CallStatus } from "@/types";

const statusLabels: Record<CallStatus, string> = {
  pending: "Chamando",
  answered: "Atendido",
  missed: "Perdida"
};

const statusVariant: Record<CallStatus, "default" | "success" | "danger"> = {
  pending: "default",
  answered: "success",
  missed: "danger"
};

type StatusBadgeProps = {
  status: CallStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{statusLabels[status]}</Badge>;
}

