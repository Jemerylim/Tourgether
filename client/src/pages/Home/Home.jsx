import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarRange, Compass, Users, Vote, Wallet } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Scene from "../../components/Scene/Scene";
import Ticket from "../../components/Ticket/Ticket";
import DepartureBoard from "../../components/DepartureBoard/DepartureBoard";
import Avatar from "../../components/Avatar/Avatar";
import Reveal from "../../components/Reveal/Reveal";
import heroImage from "../../assets/Login.png";

const legs = [
  {
    icon: Users,
    label: "Who's coming",
    text: "Invite friends and family by email. Everyone sees the same trip and can add to it.",
  },
  {
    icon: Compass,
    label: "Where to",
    text: "Not sure yet? Answer five questions and we'll suggest a destination that suits you.",
    to: "/quiz",
    cta: "Help me pick a place",
  },
  {
    icon: CalendarDays,
    label: "When",
    text: "Put flights, dinners and day trips on one calendar that stays in sync for the group.",
  },
];

// Static mock-ups of three things the app does, so a visitor sees the product before signing up.
// Illustrative data only; nothing here talks to the API.
const HEAT = [0, 1, 1, 2, 3, 3, 2, 1, 2, 3, 4, 4, 4, 3, 2, 2, 3, 4, 4, 3, 1];
const BEST = new Set([10, 11, 12]);

const PreviewCard = ({ icon: Icon, title, text, delay, children }) => (
  <Reveal delay={delay} className="flex flex-col rounded-3xl bg-white p-6 drop-shadow-ticket">
    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mustard text-ink">
      <Icon size={20} aria-hidden="true" />
    </span>
    <h3 className="font-display text-2xl text-ink">{title}</h3>
    <p className="mt-1 text-ink-soft">{text}</p>
    <div aria-hidden="true" className="mt-5 flex-1 rounded-2xl bg-paper p-4">
      {children}
    </div>
  </Reveal>
);

const Preview = () => (
  <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" aria-labelledby="preview-heading">
    <Reveal>
      <h2 id="preview-heading" className="max-w-xl font-display text-3xl text-ink sm:text-4xl">
        The arguments, settled before you leave
      </h2>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">
        Dates, decisions and money are where group trips go wrong. Tourgether gives each one a home.
      </p>
    </Reveal>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      <PreviewCard
        icon={CalendarRange}
        title="Find the dates"
        text="Everyone marks the days they're free. The best stretch lights up."
      >
        <div className="grid grid-cols-7 gap-1.5">
          {HEAT.map((level, index) => (
            <span
              key={index}
              className={`h-7 rounded-md ${BEST.has(index) ? "ring-2 ring-ink" : ""}`}
              style={{ backgroundColor: level === 0 ? "#EAF3F2" : `rgba(10, 124, 132, ${0.15 + level * 0.2})` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm font-extrabold text-ink">Best: 28 Mar to 3 Apr · 5 of 6 free</p>
      </PreviewCard>

      <PreviewCard
        delay={120}
        icon={Vote}
        title="Settle the vote"
        text="Can't pick a restaurant? Put it to a poll and put the winner on the calendar."
      >
        <p className="mb-3 text-sm font-extrabold text-ink">Dinner on night 2?</p>
        {[
          ["Ramen alley", 4],
          ["Kaiseki set menu", 2],
          ["Izakaya crawl", 1],
        ].map(([name, votes], index) => (
          <div key={name} className="mb-2 last:mb-0">
            <div className="flex justify-between text-sm font-bold text-ink">
              <span>{name}</span>
              <span className="text-ink-soft">{votes}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-lagoon-light">
              <div
                className={`h-full rounded-full ${index === 0 ? "bg-mustard" : "bg-lagoon"}`}
                style={{ width: `${(votes / 4) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </PreviewCard>

      <PreviewCard
        delay={240}
        icon={Wallet}
        title="Split the bill"
        text="Log what everyone pays. We work out who owes whom, in as few payments as possible."
      >
        <ul className="space-y-3">
          {[
            ["Mika", "Hotel deposit", "¥48,000"],
            ["Sam", "Ramen for six", "¥9,600"],
          ].map(([name, what, amount]) => (
            <li key={what} className="flex items-center gap-3">
              <Avatar name={name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-ink">{what}</span>
                <span className="block text-xs text-ink-soft">{name} paid</span>
              </span>
              <span className="text-sm font-extrabold text-ink">{amount}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-mustard/40 px-3 py-2 text-sm font-extrabold text-ink">Sam owes you ¥8,000</p>
      </PreviewCard>
    </div>
  </section>
);

const Home = () => (
  <div className="min-h-screen bg-paper text-left">
    <Navbar overlay />

    <main>
      {/* Hero: one scene that runs behind the navbar and fades into the page */}
      <Scene className="-mt-[76px] pt-[76px]" sunClassName="right-[-14%] top-[2%] h-60 w-60 md:right-[16%] md:top-[30%] md:h-80 md:w-80">
        <div className="mx-auto grid max-w-6xl items-end gap-4 px-4 pt-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24">
          <div className="pb-16 md:pb-40">
            <h1 className="font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-7xl">
              Plan the trip with the people coming on it.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">
              One itinerary, one calendar and one place to settle where everyone is eating.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-7 py-3.5 text-base">
                Create a trip
              </Link>
              <Link to="/login" className="btn-ghost px-5 py-3.5 text-base">
                Log in
              </Link>
            </div>
            <DepartureBoard to="/quiz" className="mt-10" />
          </div>

          <img
            src={heroImage}
            alt="Two travellers with a suitcase"
            className="relative mx-auto w-full max-w-sm translate-y-[4%] md:max-w-none"
          />
        </div>
      </Scene>

      <Preview />

      {/* The trip, as a boarding pass */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 md:pb-28">
        <Reveal as="h2" className="max-w-xl font-display text-3xl text-ink sm:text-4xl">
          Everything your group needs, on one ticket
        </Reveal>

        <Ticket
          className="mt-10"
          mainClassName="p-8"
          main={
            <div className="grid gap-8 md:grid-cols-3">
              {legs.map(({ icon: Icon, label, text, to, cta }) => (
                <div key={label}>
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-lagoon-light text-ink">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="font-extrabold text-ink">{label}</p>
                  <p className="mt-1 max-w-[28ch] text-ink-soft">{text}</p>
                  {to && (
                    <Link to={to} className="mt-3 inline-block font-extrabold text-plum underline underline-offset-4 hover:text-plum">
                      {cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          }
          stubClassName="flex flex-col items-start justify-center gap-4 bg-mustard p-8"
          stub={
            <>
              <p className="font-display text-2xl leading-tight text-ink">Ready to board?</p>
              <Link to="/register" className="btn-dark">
                Sign up free
              </Link>
            </>
          }
        />
      </section>
    </main>

    <Footer />
  </div>
);

export default Home;
