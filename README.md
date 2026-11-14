# CSE Motors

CSE Motors is a used-car dealership demo for CSE 340. Visitors can browse featured
vehicles, filter by category, and open listings to see photos, specifications, price,
and availability. Staff can maintain listing details from a protected inventory page.

## Local setup

1. Install Node.js 22 or later and create a PostgreSQL database.
2. Run `npm ci` and copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to your database connection string. Generate a session secret
   with `openssl rand -hex 32` and put it in `SESSION_SECRET`.
4. Run `npm run db:setup` to create the tables.
5. Set `DEMO_PASSWORD` in `.env` to the password provided with the assignment if you
   want the three demo accounts. Run `npm run db:seed` to add sample inventory.
   With `DEMO_PASSWORD` set, this also creates demo accounts whose emails are unused.
6. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

## Deploy on Render

1. In the Render dashboard, create a Postgres database in the same region and
   workspace as your existing web service. Copy its **Internal Database URL**.
2. In the web service's **Environment** tab, add `DATABASE_URL` with that URL,
   `NODE_ENV` with the value `production`, and `SESSION_SECRET` with a generated
   secret (at least 32 bytes). Set `DEMO_PASSWORD` to the test password specified
   in the assignment to enable demo accounts.
3. In the web service's **Settings**, set **Build Command** to `npm ci` and
   **Start Command** to `npm run start:render`. Deploy the latest commit.
4. Open the service's public URL and check the featured listings and demo logins.

The Render start command creates the tables and adds the sample inventory once.
It also creates missing demo accounts whenever a demo password is configured.

## Roles and demo accounts

| Role | Demo email | Permissions |
| --- | --- | --- |
| Customer | customer@csemotors.example | Browse inventory and sign in to a personal account. Public registration creates customer accounts. |
| Employee | employee@csemotors.example | Access staff inventory and edit vehicle prices, descriptions, and availability. |
| Owner | owner@csemotors.example | Use all employee inventory actions and delete vehicle listings. |

## Database schema

[`db/schema.sql`](db/schema.sql) defines the schema. Each vehicle belongs to a category
and may have multiple photos. Deleting a vehicle cascades to its photos. Category
deletion is restricted while vehicles reference the category. Accounts store bcrypt
password hashes and a role. PostgreSQL also stores the Express sessions.

## Known limitations

- Contact messages, reviews, and the service request workflow are pending.
- Owner tools for adding vehicles, managing categories, managing users, and viewing
  system activity are pending.
- The pgAdmin ERD and Render deployment are pending.
- Sample inventory uses illustrative vehicle photos. Photo credits and source links
  appear on the listing pages.
