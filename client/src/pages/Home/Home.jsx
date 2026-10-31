import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Compass, Users } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Scene from "../../components/Scene/Scene";
import Ticket from "../../components/Ticket/Ticket";
import DepartureBoard from "../../components/DepartureBoard/DepartureBoard";
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
    text: "Not sure yet? Take the travel quiz for ideas that match how you like to explore.",
    to: "/quiz",
    cta: "Take the quiz",
  },
  {
    icon: CalendarDays,
    label: "When",
    text: "Put flights, dinners and day trips on one calendar that stays in sync for the group.",
  },
];

const Home = () => (
  <div className="min-h-screen bg-paper text-left">
    <Navbar overlay />

    <main>
      {/* Hero: one scene that runs behind the navbar and fades into the page */}
      <Scene className="-mt-[76px] pt-[76px]" sunClassName="right-[16%] top-[30%] h-80 w-80">
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
            <DepartureBoard className="mt-10" />
          </div>

          <img
            src={heroImage}
            alt="Two travellers with a suitcase"
            className="relative mx-auto w-full max-w-sm translate-y-[4%] md:max-w-none"
          />
        </div>
      </Scene>

      {/* The trip, as a boarding pass */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 md:pb-28">
        <h2 className="max-w-xl font-display text-3xl text-ink sm:text-4xl">
          Everything your group needs, on one ticket
        </h2>

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
