import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Compass, MapPin } from "lucide-react";
import { StyleChips } from "../Profile/TravelStyles";
import { useToast } from "../../components/Toast/Toast";
import { apiErrorMessage } from "../../lib/apiError";
import { saveTravelStyles, stylesFromAnswers } from "../../lib/travelStyles";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import PageLayout from "../../components/PageLayout/PageLayout";
import Scene from "../../components/Scene/Scene";
import Ticket from "../../components/Ticket/Ticket";
import DepartureBoard from "../../components/DepartureBoard/DepartureBoard";
import { EmptyState } from "../../components/PageState/PageState";
import quizImage from "../../assets/Register.png";
import { coverPhoto } from "../../lib/trips";
import { questions, reasons, recommend } from "./destinations";

const isLoggedIn = () => Boolean(localStorage.getItem("authToken"));

// "Don't know where to go?" A few questions, then a destination suggestion.
const Quiz = () => {
    const [currentQuestion, setCurrentQuestion] = useState(-1); // -1 is the intro
    const [answers, setAnswers] = useState([]); // option index per question
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentQuestion]);

    const selected = answers[currentQuestion];
    const isLast = currentQuestion === questions.length - 1;

    const choose = (optionIndex) => {
        const next = [...answers];
        next[currentQuestion] = optionIndex;
        setAnswers(next);
    };

    const handleNext = () => {
        if (selected === undefined) return; // The button is disabled until an option is picked
        if (isLast) {
            navigate("/result", { state: { answers } });
        } else {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handleSkip = () => {
        navigate(isLoggedIn() ? "/dashboard" : "/");
    };

    if (currentQuestion === -1) {
        return (
            <div className="text-left">
                <Navbar overlay />
                <Scene className="-mt-[76px] min-h-screen pt-[76px]" sunClassName="right-[14%] top-[26%] h-72 w-72">
                    <main className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-6xl flex-col justify-center px-4 pb-32 sm:px-6">
                        <h1 className="max-w-2xl font-display text-5xl leading-[1.04] text-ink sm:text-6xl">
                            Don't know where to go?
                        </h1>
                        <p className="mt-6 max-w-md text-lg text-ink-soft">
                            Answer {questions.length} quick questions about how you like to travel and we'll
                            suggest a place, plus a couple of backups.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <button className="btn-primary px-7 py-3.5 text-base" onClick={() => setCurrentQuestion(0)}>
                                Find me a destination
                            </button>
                            <button className="btn-ghost px-5 py-3.5 text-base" onClick={handleSkip}>
                                Not now
                            </button>
                        </div>
                        <DepartureBoard className="mt-10" />
                    </main>
                </Scene>
                <Footer />
            </div>
        );
    }

    const { question, options } = questions[currentQuestion];

    return (
        <PageLayout
            maxWidth="max-w-3xl"
            sun="right-[4%] top-[12%] h-20 w-20 sm:right-[10%] sm:top-[18%] sm:h-36 sm:w-36"
            kicker={
                <div className="flex items-center gap-3">
                    <ul className="flex gap-2" aria-hidden="true">
                        {questions.map((_, index) => (
                            <li
                                key={index}
                                className={`h-3 w-3 rounded-full ${index <= currentQuestion ? "bg-ink" : "bg-ink/20"}`}
                            />
                        ))}
                    </ul>
                    <p className="text-sm font-extrabold text-ink-soft">
                        Question {currentQuestion + 1} of {questions.length}
                    </p>
                </div>
            }
            title={question}
        >
            <div className="relative">
                <fieldset>
                    <legend className="sr-only">{question}</legend>
                    <div className="space-y-3">
                        {options.map((option, index) => (
                            <label
                                key={option.label}
                                className="flex cursor-pointer items-center gap-4 rounded-2xl bg-white p-5 font-bold text-ink drop-shadow-ticket transition hover:-translate-y-0.5 has-[:checked]:bg-mustard has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lagoon"
                            >
                                <input
                                    type="radio"
                                    name={`question-${currentQuestion}`}
                                    value={index}
                                    checked={selected === index}
                                    onChange={() => choose(index)}
                                    className="peer sr-only"
                                />
                                <span
                                    aria-hidden="true"
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lagoon-light font-extrabold peer-checked:bg-ink peer-checked:text-white"
                                >
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className="flex-1">{option.label}</span>
                                <Check size={20} className="invisible shrink-0 peer-checked:visible" aria-hidden="true" />
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button onClick={handleNext} disabled={selected === undefined} className="btn-primary px-7 py-3.5 text-base">
                        {isLast ? "Show my destination" : "Next question"}
                    </button>
                    <button className="btn-ghost" onClick={() => setCurrentQuestion(currentQuestion - 1)}>
                        <ArrowLeft size={16} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <img
                    src={quizImage}
                    alt=""
                    className="pointer-events-none absolute bottom-0 left-full ml-6 hidden w-64 xl:block"
                />
            </div>
        </PageLayout>
    );
};

export default Quiz;

export const Result = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const answers = location.state?.answers;
    const ranked = answers ? recommend(answers) : [];
    const [pick, ...rest] = ranked;
    const alternatives = rest.slice(0, 2);
    const [photo, setPhoto] = useState();
    const { showToast } = useToast();
    const styles = answers ? stylesFromAnswers(answers) : [];
    const [savedStyles, setSavedStyles] = useState(false);

    const saveStyles = async () => {
        try {
            await saveTravelStyles(styles);
            setSavedStyles(true);
            showToast("Travel style added to your profile", "success");
        } catch (err) {
            showToast(apiErrorMessage(err, "Couldn't save your travel style"), "error");
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!pick) return undefined;
        let cancelled = false;
        coverPhoto(`${pick.name} ${pick.country}`, `destination:${pick.name}`).then((url) => {
            if (!cancelled) setPhoto(url);
        });
        return () => {
            cancelled = true;
        };
    }, [pick?.name]);

    // Logged in: open Create trip with the name filled in. Otherwise sign up first.
    const planTrip = (destination) =>
        isLoggedIn()
            ? navigate("/create-trip", { state: { tripName: `${destination.name} trip` } })
            : navigate("/register");

    if (!pick) {
        return (
            <PageLayout footer maxWidth="max-w-3xl" title="Where should you go?">
                <EmptyState
                    icon={Compass}
                    title="Take the quiz first"
                    text="Answer a few questions and we'll suggest a destination."
                    action={
                        <Link to="/quiz" className="btn-primary">
                            Start the quiz
                        </Link>
                    }
                />
            </PageLayout>
        );
    }

    return (
        <PageLayout
            footer
            maxWidth="max-w-5xl"
            sun="right-[4%] top-[12%] h-20 w-20 sm:right-[10%] sm:top-[18%] sm:h-36 sm:w-36"
            title={`Pack for ${pick.name}`}
            subtitle="Based on your answers, this is where we'd send you."
        >
            <Ticket
                mainClassName="p-0"
                main={
                    <>
                        <div className="relative h-56 overflow-hidden rounded-t-3xl bg-gradient-to-br from-lagoon to-ink sm:h-72 sm:rounded-tr-none">
                            {photo ? (
                                <img src={photo} alt={`${pick.name}, ${pick.country}`} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-white/60">
                                    <MapPin size={56} aria-hidden="true" />
                                </div>
                            )}
                            <div
                                className="absolute bottom-4 right-4 flex h-28 w-28 rotate-[-10deg] flex-col items-center justify-center rounded-full bg-plum p-2 text-center text-paper shadow-soft"
                                aria-hidden="true"
                            >
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-paper/70">Next stop</span>
                                <span className="font-display text-xl leading-tight">{pick.name}</span>
                            </div>
                        </div>
                        <div className="p-6 sm:p-8">
                            <p className="text-lg text-ink-deep">{pick.blurb}</p>
                            {pick.matched.length > 0 && (
                                <>
                                    <h2 className="mt-6 font-display text-2xl text-ink">Why it fits you</h2>
                                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {pick.matched.slice(0, 6).map((tag) => (
                                            <li key={tag} className="flex items-start gap-2 text-ink-soft">
                                                <Check size={18} className="mt-0.5 shrink-0 text-lagoon" aria-hidden="true" />
                                                {reasons[tag]}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </>
                }
                stubClassName="flex flex-col justify-between gap-8 bg-mustard p-6 sm:w-72 sm:p-8"
                stub={
                    <>
                        <div>
                            <p className="text-xs font-extrabold text-ink/70">Destination</p>
                            <p className="font-display text-3xl leading-tight text-ink">{pick.name}</p>
                            <p className="font-bold text-ink-soft">{pick.country}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button className="btn-dark w-full" onClick={() => planTrip(pick)}>
                                {isLoggedIn() ? `Plan a trip to ${pick.name}` : "Sign up to plan it"}
                            </button>
                            <Link to="/quiz" className="btn-ghost w-full">
                                Retake quiz
                            </Link>
                        </div>
                    </>
                }
            />

            {styles.length > 0 && (
                <section className="mt-10 rounded-3xl bg-lagoon-light p-6 sm:p-8" aria-labelledby="style-heading">
                    <h2 id="style-heading" className="font-display text-2xl text-ink">
                        Your travel style
                    </h2>
                    <StyleChips styles={styles} className="mt-4" />
                    {isLoggedIn() ? (
                        <button className="btn-dark mt-5" onClick={saveStyles} disabled={savedStyles}>
                            {savedStyles ? "Added to your profile" : "Add to my profile"}
                        </button>
                    ) : (
                        <p className="mt-4 text-ink-soft">Sign up and we'll keep this on your profile for your travel group.</p>
                    )}
                </section>
            )}

            {alternatives.length > 0 && (
                <section className="mt-14" aria-labelledby="alternatives-heading">
                    <h2 id="alternatives-heading" className="mb-6 font-display text-2xl text-ink">
                        Also worth a look
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {alternatives.map((destination) => (
                            <article key={destination.name} className="flex flex-col rounded-3xl bg-white p-6 drop-shadow-ticket">
                                <p className="font-display text-2xl text-ink">{destination.name}</p>
                                <p className="text-sm font-bold text-ink-soft">{destination.country}</p>
                                <p className="mt-3 flex-1 text-ink-soft">{destination.blurb}</p>
                                <button className="btn-ghost -ml-3 mt-4 self-start" onClick={() => planTrip(destination)}>
                                    {isLoggedIn() ? `Plan ${destination.name} instead` : "Sign up to plan it"}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </PageLayout>
    );
};
