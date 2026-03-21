import { Check, X, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  source: string;
  status: "pending" | "approved" | "rejected";
}

interface LeadResultsTableProps {
  leads: LeadResult[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function LeadResultsTable({ leads, onApprove, onReject }: LeadResultsTableProps) {
  if (leads.length === 0) return null;

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold">Contact</TableHead>
            <TableHead className="text-xs font-semibold">Company</TableHead>
            <TableHead className="text-xs font-semibold">Title</TableHead>
            <TableHead className="text-xs font-semibold">Industry</TableHead>
            <TableHead className="text-xs font-semibold">Size</TableHead>
            <TableHead className="text-xs font-semibold">Email</TableHead>
            <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead, i) => (
            <TableRow
              key={lead.id}
              className={cn(
                "animate-in fade-in-0 slide-in-from-bottom-2",
                lead.status === "approved" && "bg-[hsl(var(--success))]/5",
                lead.status === "rejected" && "opacity-50"
              )}
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
            >
              <TableCell className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  {lead.contact_name}
                  {lead.linkedin_url && (
                    <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{lead.company}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.job_title}</TableCell>
              <TableCell>
                {lead.vertical && (
                  <Badge variant="secondary" className="text-xs">{lead.vertical}</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.company_size}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
              <TableCell className="text-right">
                {lead.status === "pending" ? (
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => onApprove(lead.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onReject(lead.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant={lead.status === "approved" ? "default" : "secondary"} className="text-xs">
                    {lead.status}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SearchLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in-0 duration-300">
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(262,80%,58%)] to-[hsl(280,80%,60%)] flex items-center justify-center shadow-[0_8px_32px_-8px_hsl(262,80%,58%/0.5)]">
          <Loader2 className="h-7 w-7 text-white animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(262,80%,58%)] to-[hsl(280,80%,60%)] animate-ping opacity-20" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Searching for leads…</p>
      <p className="text-xs text-muted-foreground">Our AI is analyzing millions of profiles to find your ideal matches</p>
    </div>
  );
}
