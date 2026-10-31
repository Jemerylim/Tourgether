import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Start each new page at the top. Back/Forward (POP) are left alone so the browser can
// put you back where you were, and query-only changes (e.g. trip sections) don't jump.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
