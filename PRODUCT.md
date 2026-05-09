# GolBet — Product Context

## Register
product

## Product Purpose
Private sports-betting pool for a group of friends during "Copa do Mundo Rolemberg" — a private tournament. Participants deposit money (via PIX), place bets on match results and top scorers, and win from the pool. One admin manages everything. Not a commercial platform; trust-based, informal.

## Users
- **Bettors (apostadores):** friends of the organizer, 20–200 people, mostly on mobile, betting casually. Low technical sophistication. Expect WhatsApp-style simplicity.
- **Admin (single user):** the organizer. Manages deposits, games, long-term markets, artilheiro markets. Uses a password-protected panel.

## Scale
~200 users/day, ~50 concurrent bettors during match windows, ~100 simultaneous connections. Hosted on Render free/starter tier with SQLite + WAL mode.

## Brand Tone
Casual, exciting, trustworthy. Portuguese (Brazilian). No corporate language. Feels like betting with friends, not a casino.

## Anti-references
- Generic dark-blue sports betting apps (Bet365, Betfair visual language)
- Neon-on-black crypto/gaming aesthetic
- SaaS dashboard templates

## Strategic Principles
- Mobile-first: most users are on phones
- Simplicity over features: one action per screen, never confuse
- Trust signals matter: saldo always visible, bets always confirmable
- Admin must be fast: 1-click actions for opening/closing games

## Tech Stack
React 18 + Vite, Node.js/Express, SQLite (WAL mode), Render hosting, Axios, Lucide icons, Tailwind + custom CSS variables
