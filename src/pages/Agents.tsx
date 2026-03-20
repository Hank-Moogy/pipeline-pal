import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrendingUp, LogOut, BarChart3, Kanban, Bot, UserSearch, GitBranch, Mail, Share2, ArrowRight } from "lucide-react";

const AGENTS = [
  {
    id: "lead-gen",
    title: "Lead Gen",
    description: "Discover and qualify potential leads based on your Ideal Customer Profile. Get AI-powered suggestions and approve them into your pipeline.",
    icon: UserSearch,
    color: "text-[hsl(var(--info))]",
    bg: "bg-[hsl(var(--info))]/10",
  },
  {
    id: "pipeline",
    title: "Pipeline Manager",
    description: "Get insights on your deal pipeline, identify at-risk deals, and receive prioritized action suggestions.",
    icon: GitBranch,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "crm",
    title: "CRM & Outreach",
    description: "Draft personalized outreach emails, create follow-up sequences, and manage your communication pipeline.",
    icon: Mail,
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/10",
  },
  {
    id: "social",
    title: "Social Media",
    description: "Generate engaging social media content, create post variants, and manage your content calendar.",
    icon: Share2,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

export default function Agents() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Deal Tracker</h1>
            <nav className="ml-6 flex items-center gap-1">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/pipeline">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </Button>
              </Link>
              <Button variant="secondary" size="sm" className="gap-1.5 pointer-events-none">
                <Bot className="h-4 w-4" />
                Agents
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">AI Agents Hub</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Your team of AI agents that learn your preferences and help you close deals faster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTS.map((agent) => (
            <Link key={agent.id} to={`/agents/${agent.id}`}>
              <Card className="h-full hover:border-primary/30 transition-all hover:shadow-md group cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${agent.bg} flex items-center justify-center`}>
                      <agent.icon className={`h-5 w-5 ${agent.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{agent.title}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs leading-relaxed">
                    {agent.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
