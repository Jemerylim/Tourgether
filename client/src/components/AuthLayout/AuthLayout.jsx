import React from "react";
import Navbar from "../Navbar/Navbar";
import Scene from "../Scene/Scene";
import Ticket from "../Ticket/Ticket";
import DepartureBoard from "../DepartureBoard/DepartureBoard";

// Login/Register: one continuous scene. The form is a boarding pass (fields on the
// ticket, the "other way in" links on the stub) and the travellers stand on the hills.
const AuthLayout = ({ image, imageAlt = "", caption, footer, imageSide = "right", children }) => {
  const imageOnLeft = imageSide === "left";

  return (
    <div className="text-left">
      <Navbar overlay />
      <Scene
        className="-mt-[76px] min-h-screen pt-[76px]"
        sunClassName={imageOnLeft ? "left-[12%] top-[26%] h-80 w-80" : "right-[12%] top-[26%] h-80 w-80"}
      >
        <main className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2">
          <div className={imageOnLeft ? "lg:col-start-2" : undefined}>
            {caption && (
              <p className="max-w-md font-display text-4xl leading-[1.05] text-ink sm:text-5xl">{caption}</p>
            )}
            <DepartureBoard className="mb-8 mt-5" />
            <Ticket
              stacked
              className="w-full max-w-md"
              main={<div className="p-2 sm:p-4">{children}</div>}
              stubClassName="bg-mustard px-6 py-5"
              stub={footer}
            />
          </div>
        </main>

        <img
          src={image}
          alt={imageAlt}
          className={`pointer-events-none absolute bottom-0 z-[5] hidden w-[36vw] max-w-lg translate-y-[4%] lg:block ${
            imageOnLeft ? "left-[7%]" : "right-[7%]"
          }`}
        />
      </Scene>
    </div>
  );
};

export default AuthLayout;
