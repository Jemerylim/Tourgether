import React from "react";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import Scene from "../Scene/Scene";
import PageHeader from "../PageHeader/PageHeader";

// Shell for the signed-in pages: the page title sits in a short sky band with hills, and
// the content floats up over the hills, so every page shares the landing page's look.
const PageLayout = ({
  title,
  subtitle,
  kicker,
  back,
  actions,
  maxWidth = "max-w-6xl",
  sun = "right-[4%] top-[12%] h-20 w-20 sm:right-[30%] sm:top-[14%] sm:h-36 sm:w-36",
  footer = false,
  children,
}) => (
  <div className="flex min-h-screen flex-col bg-paper text-left">
    <Navbar overlay />
    <Scene className="-mt-[76px] pt-[76px]" sunClassName={sun}>
      <div className={`relative z-10 mx-auto w-full ${maxWidth} px-4 pb-32 pt-10 sm:px-6`}>
        <PageHeader title={title} subtitle={subtitle} kicker={kicker} back={back} actions={actions} />
      </div>
    </Scene>
    <main className={`relative z-10 mx-auto -mt-6 w-full flex-1 ${maxWidth} px-4 pb-16 sm:px-6`}>{children}</main>
    {footer && <Footer />}
  </div>
);

export default PageLayout;
