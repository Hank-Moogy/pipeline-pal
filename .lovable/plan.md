

# B2B Sales Pipeline Deal Tracker

## Overview
A dark-themed, team-accessible dashboard that tracks your sales pipeline week over week. Upload your CRM CSV export every Monday and instantly see how your pipeline is evolving.

## Authentication
- Email/password signup & login for team members
- Protected dashboard behind auth

## Core Flow
1. **CSV Upload Page** — Upload your weekly CRM export (matching the people.csv format). Each upload is tagged with its upload date/week.
2. **Data Processing** — Parse CSV, extract key fields: deal status (`Status`), deal value (`Deal value`), company, prospect owner, and timestamps. Store in Supabase with week identifier.

## Dashboard Metrics (with Week-over-Week Δ)
Each metric shows current week value + change from previous week (green/red indicators):

1. **Deals by Status** — Bar chart + table showing # of deals per status (Lead, Prospect, Email follow up, Discovery Meeting, Tech Qualification, Design proposal, Committed, Closed-won, Closed-lost, Recycle)
2. **Total Deal Value by Status** — Sum of `Deal value` grouped by status
3. **Weighted Amount by Status** — Deal value × stage probability weight per status
4. **Average Days in Status** — How long deals have stayed in their current status (computed from interaction dates)
5. **Total Pipeline Value** — Sum of all active deal values (excluding Closed-won, Closed-lost)
6. **Total Weighted Pipeline Value** — Sum of all weighted amounts

## Stage Probability Weights
| Stage | Weight |
|---|---|
| Lead | 10% |
| Prospect | 10% |
| Email follow up | 10% |
| Discovery Meeting | 40% |
| Tech Qualification | 60% |
| Design proposal | 60% |
| Committed | 80% |
| Closed-won | 100% |
| Closed-lost | 0% |
| Recycle | 5% |
| No status | 0% |

## Design
- Dark background with glowing accent cards
- Metric cards with large numbers, WoW delta badges (↑ green / ↓ red)
- Charts using Recharts (bar + donut)
- Week selector dropdown to compare any two weeks
- Responsive layout

## Tech Stack
- React + TypeScript + Tailwind (dark theme)
- Supabase for auth, database (uploads table, deals table, weekly snapshots)
- Recharts for data visualization
- CSV parsing with Papa Parse

