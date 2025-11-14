import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CallStatus = "pending" | "answered" | "missed" | "active";

interface StatusBadgeProps {
  status: CallStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Pendente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  answered: {
    label: "Atendida",
    className: "bg-success/10 text-success border-success/20",
  },
  missed: {
    label: "Perdida",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  active: {
    label: "Ativa",
    className: "bg-primary/10 text-primary border-primary/20 animate-pulse-glow",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
