<!-- CAMPUSCONNECT AI | CINEMATIC DIGITAL CAMPUS README -->

<div align="center">

<img src="cinema-hero (3).svg" width="100%" alt="CampusConnect AI: a glowing campus at dusk with a clock tower, lamp-lit paths and fireflies" />

<a href="https://github.com/SyedRaqi/CampusAI">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=900&color=5EEAD4&center=true&vCenter=true&width=780&lines=One+campus.+One+connected+place.;Events%2C+learning%2C+careers%2C+community.;Three+roles.+One+platform.;An+AI+study+hall+for+signed-in+students." alt="Typing animation" />
</a>

<br/>

<a href="#showcase"><img src="https://img.shields.io/badge/SHOWCASE-0F766E?style=for-the-badge&logo=figma&logoColor=white" alt="Showcase"/></a>
&nbsp;
<a href="#atlas"><img src="https://img.shields.io/badge/CAMPUS%20ATLAS-0E7490?style=for-the-badge&logo=googlemaps&logoColor=white" alt="Campus atlas"/></a>
&nbsp;
<a href="#ai"><img src="https://img.shields.io/badge/AI%20STUDY%20HALL-7C3AED?style=for-the-badge&logo=openai&logoColor=white" alt="AI study hall"/></a>
&nbsp;
<a href="#arch"><img src="https://img.shields.io/badge/ARCHITECTURE-2563EB?style=for-the-badge&logo=supabase&logoColor=white" alt="Architecture"/></a>
&nbsp;
<a href="#movein"><img src="https://img.shields.io/badge/MOVE%20IN-D97706?style=for-the-badge&logo=npm&logoColor=white" alt="Move in"/></a>
&nbsp;
<a href="#status"><img src="https://img.shields.io/badge/HONEST%20STATUS-BE123C?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Honest status"/></a>

<br/><br/>

<img src="https://img.shields.io/badge/REACT-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/>
<img src="https://img.shields.io/badge/TYPESCRIPT-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/VITE-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
<img src="https://img.shields.io/badge/SUPABASE-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>

<br/><br/>

<img src="cinema-stats (2).svg" width="100%" alt="3 roles, 9 AI tools, 5 deploy gates, 1 connected campus" />

</div>

<img src="cinema-walkway (3).svg" width="100%" alt="Students walking along a lamp-lit campus path" />

<a name="orientation"></a>
<img src="cinema-h-orientation.svg" width="100%" alt="Orientation Day" />

> **Welcome to CampusConnect AI.**

It's a React 19, TypeScript, Vite, and Supabase application for **campus operations, learning, careers, and student collaboration**, built for Anjuman Institute of Technology.

One thing to know before you wander in: CampusConnect AI extends the existing **Phases 1–10**. It is **not a separate chatbot application**. The AI workspace is one more room in a campus that already runs on events, clubs, resources, and dashboards.

<a name="showcase"></a>
<img src="cinema-h-showcase.svg" width="100%" alt="Campus Showcase" />

<div align="center">
<img src="cinema-showcase.svg" width="100%" alt="Illustrative student dashboard on a laptop and an event QR ticket on a phone" />
</div>

<br/>

<sub>Illustrative interface designed for this README. These are concept visuals with sample data, not live screenshots.</sub>

<a name="journey"></a>
<img src="cinema-h-journey.svg" width="100%" alt="Student Journey" />

<div align="center">
<img src="cinema-journey.svg" width="100%" alt="Student journey: sign in, discover, register, join, chat, ask the AI, grow" />
</div>

<img src="cinema-walkway (3).svg" width="100%" alt="Students walking along a lamp-lit campus path" />

<a name="atlas"></a>
<img src="cinema-h-atlas.svg" width="100%" alt="Campus Atlas" />

<div align="center">
<img src="cinema-atlas.svg" width="100%" alt="Campus atlas: five districts of CampusConnect AI connected to a central hub" />
</div>

<br/>

<details open>
<summary><b>📋 Full capability list, straight from the code</b></summary>

<br/>

- Student, faculty, and administrator authentication, role-based dashboards, and protected routes
- Campus events, registrations, QR tickets, academic resources, internships, and career profiles
- Clubs, project teams, private chat, notifications, and campus support
- Academic operations, announcements, campus search, analytics, and audit logs
- An authenticated AI workspace for campus Q&A/search, study plans, quizzes, notes, summaries, career guidance, roadmaps, interview practice, and project planning

</details>

<a name="doors"></a>
<img src="cinema-h-doors.svg" width="100%" alt="Three Doors In" />

<div align="center">
<img src="cinema-doors.svg" width="100%" alt="Three doors that open in turn: student, faculty and administrator" />
</div>

<br/>

Students, faculty, and administrators each sign in through their own door and land on a role-based dashboard. Protected routes keep every room behind the right key.

<a name="ai"></a>
<img src="cinema-h-ai.svg" width="100%" alt="The AI Study Hall" />

<div align="center">
<img src="cinema-ai-hall.svg" width="100%" alt="AI study hall: nine AI tools orbiting the authenticated AI workspace" />
</div>

<br/>

The AI workspace is **authenticated**, so only signed-in users get in. Nine tools orbit it: campus Q&A and search, study plans, quizzes, notes, summaries, career guidance, roadmaps, interview practice, and project planning.

<div align="center">
<img src="cinema-ai-chat.svg" width="100%" alt="Illustrative AI workspace conversation producing a 7-day study plan" />
</div>

<br/>

> 🔐 **House rule:** the AI provider key lives in Supabase Edge Function secrets. It never goes in browser code, `.env.local`, or any `VITE_*` variable.

<img src="cinema-walkway (3).svg" width="100%" alt="Students walking along a lamp-lit campus path" />

<a name="ops"></a>
<img src="cinema-h-ops.svg" width="100%" alt="The Ops Deck" />

<div align="center">
<img src="cinema-analytics.svg" width="100%" alt="Illustrative admin analytics and audit log with sample data" />
</div>

<br/>

<sub>Illustrative interface with sample data. It represents the analytics and audit-log capabilities listed above.</sub>

<a name="arch"></a>
<img src="cinema-h-arch.svg" width="100%" alt="Under the Hood" />

<div align="center">
<img src="cinema-architecture.svg" width="100%" alt="Architecture: React app, Supabase services, and Edge Functions calling the AI provider server-side" />
</div>

<a name="security"></a>
<img src="cinema-h-security.svg" width="100%" alt="Security Layers" />

<div align="center">
<img src="cinema-security.svg" width="100%" alt="Four layers of defence protecting campus data" />
</div>

<img src="cinema-walkway (3).svg" width="100%" alt="Students walking along a lamp-lit campus path" />

<a name="movein"></a>
<img src="cinema-h-movein.svg" width="100%" alt="Move-In Day" />

<div align="center">
<img src="cinema-shuttle.svg" width="100%" alt="Campus shuttle visiting four setup stops: install, configure, run, check" />
</div>

<br/>

**Requirements:** Node.js supported by the installed Vite version, and npm.

**Stop 1 · Install, and Stop 2 · Configure**

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` in `.env.local`. These are browser-facing Supabase project settings. **Do not put a service-role key or AI provider key in a `VITE_*` variable.** `.env.local` is ignored by Git.

**Stop 3 · Run**

```powershell
npm run dev
```

**Stop 4 · Check**

```powershell
npm run build
npm run lint
```

`npm run build` type-checks and production-builds the app. `npm run lint` runs the configured linter. There is currently **no automated test script or test framework** in `package.json`.

<a name="backend"></a>
<img src="cinema-h-backend.svg" width="100%" alt="Backend Bring-Up" />

<div align="center">
<img src="cinema-gates.svg" width="100%" alt="Five gates to climb before production: backup, baseline, migrate, deploy functions, verify" />
</div>

<br/>

1. **Back up.** Create or select the intended Supabase project and take a backup before changing an existing database.
2. **Baseline.** For a **new, empty** project, establish the baseline in [`supabase/schema.sql`](supabase/schema.sql) once. Do not blindly reapply this baseline to an existing project; review its schema and migration history first.
3. **Migrate.** Apply versioned SQL migrations in timestamp order from [`supabase/migrations/`](supabase/migrations). The Phase 11 security migration prevents self-service role escalation and adds chat messages to the Realtime publication.
4. **Deploy functions.** Deploy the authenticated Edge Functions and configure AI credentials as Supabase Edge Function secrets. Follow [`docs/AI_SETUP.md`](docs/AI_SETUP.md); never put the provider key in browser code or `.env.local`.
5. **Verify.** Check authorization, RLS, Storage, Realtime, scheduled tasks, and the AI provider against a non-production project before production rollout.

<img src="cinema-walkway (3).svg" width="100%" alt="Students walking along a lamp-lit campus path" />

<a name="blueprint"></a>
<img src="cinema-h-blueprint.svg" width="100%" alt="Campus Blueprint" />

<div align="center">
<img src="cinema-blueprint.svg" width="100%" alt="Blueprint of the CampusConnect AI repository layout" />
</div>

<br/>

| 🏛️ BUILDING | 📍 WHAT'S INSIDE |
|---|---|
| `src/` | Application UI, routes, contexts, and Supabase-backed services |
| `supabase/schema.sql` | Core schema and baseline policies |
| `supabase/migrations/` | Phased, versioned database changes |
| `supabase/functions/` | Edge Function handlers and shared server-side AI utilities |
| `docs/` | AI setup, phase setup guides, and readiness checklists |

<a name="roadmap"></a>
<img src="cinema-h-roadmap.svg" width="100%" alt="The Roadmap" />

<div align="center">
<img src="cinema-roadmap.svg" width="100%" alt="Roadmap: phases 1 to 10, phase 11, then verify and launch" />
</div>

<a name="status"></a>
<img src="cinema-h-status.svg" width="100%" alt="Honest Status" />

<div align="center">
<img src="cinema-status.svg" width="100%" alt="A local build does not prove the Supabase backend is ready" />
</div>

<br/>

This inventory reflects code in the repository. It does not imply that a Supabase project, its migrations, Edge Functions, or production deployment have been configured or tested. See [the Phase 11 readiness report](docs/PHASE11_READINESS.md) for verified checks and remaining deployment gates.

Live project setup, migration state, and deployment status are not verified by a local build. **Do not treat a successful frontend build as evidence that the Supabase backend is ready.**

<a name="handbook"></a>
<img src="cinema-h-handbook.svg" width="100%" alt="The Handbook" />

| 📖 GUIDE | 🎯 USE IT FOR |
|---|---|
| [AI setup and Edge Function deployment](docs/AI_SETUP.md) | Getting the AI workspace's server side running |
| [Phase 11 inventory, security findings, and deployment gates](docs/PHASE11_READINESS.md) | What's verified, and what's still blocking production |
| [Campus support setup](docs/CAMPUS_SUPPORT_SETUP.md) | Setting up campus support |

<div align="center">

<img src="cinema-bell.svg" width="100%" alt="CampusConnect AI with a swinging school bell" />

**CampusConnect AI** · Built by [Syed Raqi](https://github.com/SyedRaqi) · [⭐ Star the repo](https://github.com/SyedRaqi/CampusAI)

<sub>AI-powered campus management and student collaboration platform for Anjuman Institute of Technology.</sub>

</div>
