import { useState } from "react";
import { Check, X, ExternalLink, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LeadResult {
  id: string;
  company: string;
  contact_name: string;
  job_title: string;
  email: string;
  linkedin_url: string;
  company_size: string;
  vertical: string;
  location: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface LeadResultsTableProps {
  leads: LeadResult[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onBulkAddToPipe: (ids: string[]) => void;
}

function RejectPopover({ onReject }: { onReject: (reason?: string) => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10">
          <X className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium mb-2 text-foreground">Why reject this lead?</p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional feedback…"
          className="text-xs min-h-[60px] mb-2"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={() => {
              onReject(reason || undefined);
              setOpen(false);
            }}
          >
            Reject
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LeadResultsTable({ leads, onApprove, onReject, onBulkAddToPipe }: LeadResultsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (leads.length === 0) return null;

  const pendingLeads = leads.filter((l) => l.status === "pending");
  const allPendingSelected = pendingLeads.length > 0 && pendingLeads.every((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingLeads.map((l) => l.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectedPending = [...selected].filter((id) => leads.find((l) => l.id === id)?.status === "pending");

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary">
          {leads.length} result{leads.length !== 1 ? "s" : ""} found
        </p>
        <Button
          size="sm"
          disabled={selectedPending.length === 0}
          onClick={() => {
            onBulkAddToPipe(selectedPending);
            setSelected(new Set());
          }}
          className="gap-1.5 bg-gradient-to-r from-primary to-[hsl(160,60%,38%)] hover:from-primary/90 hover:to-[hsl(160,60%,34%)] text-primary-foreground shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to Pipe {selectedPending.length > 0 && `(${selectedPending.length})`}
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 text-center">
                <Checkbox checked={allPendingSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="w-10 text-xs font-semibold text-muted-foreground">#</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">NAME</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">TITLE</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">COMPANY</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">LOCATION</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">LINKEDIN URL</TableHead>
              <TableHead className="text-xs font-semibold text-right text-muted-foreground">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead, i) => (
              <TableRow
                key={lead.id}
                className={cn(
                  "animate-in fade-in-0 slide-in-from-bottom-2 group",
                  lead.status === "approved" && "bg-primary/5",
                  lead.status === "rejected" && "opacity-40"
                )}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={selected.has(lead.id)}
                    onCheckedChange={() => toggle(lead.id)}
                    disabled={lead.status !== "pending"}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-medium">{i + 1}</TableCell>
                <TableCell className="text-sm font-medium">{lead.contact_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{lead.job_title}</TableCell>
                <TableCell className="text-sm">{lead.company}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{lead.location || "—"}</TableCell>
                <TableCell className="text-sm">
                  {lead.linkedin_url ? (
                    <a
                      href={lead.linkedin_url.startsWith("http") ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary flex items-center gap-1 truncate max-w-[180px]"
                    >
                      {lead.linkedin_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {lead.status === "pending" ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        onClick={() => onApprove(lead.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <RejectPopover onReject={(reason) => onReject(lead.id, reason)} />
                    </div>
                  ) : (
                    <Badge
                      variant={lead.status === "approved" ? "default" : "secondary"}
                      className={cn("text-xs", lead.status === "approved" && "bg-primary/15 text-primary border-0")}
                    >
                      {lead.status}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SearchLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in-0 duration-300">
      <div className="relative mb-8">
        {/* Outer glow rings */}
        <div className="absolute inset-[-12px] rounded-3xl bg-gradient-to-br from-primary/20 to-[hsl(160,60%,38%)]/20 animate-pulse" />
        <div className="absolute inset-[-6px] rounded-2xl bg-gradient-to-br from-primary/10 to-[hsl(160,60%,38%)]/10 animate-pulse" style={{ animationDelay: "150ms" }} />
        {/* Main icon */}
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(160,60%,38%)] flex items-center justify-center shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]">
          <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" />
        </div>
      </div>
      {/* Skeleton rows preview */}
      <div className="w-full max-w-2xl space-y-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 120}ms`, width: `${100 - i * 5}%`, margin: "0 auto" }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Searching for leads…</p>
      <p className="text-xs text-muted-foreground">Analyzing profiles to find your ideal matches</p>
    </div>
  );
}
